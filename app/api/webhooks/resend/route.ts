import { NextResponse } from "next/server";

import { tryConnectToDatabase } from "@/lib/db/client";
import {
  NewsletterRecipientModel,
  NewsletterSubscriberModel,
} from "@/lib/db/models/platform";
import { isHandledEvent, verifyWebhookSignature } from "@/lib/email/webhook";

export const runtime = "nodejs";

/** Corps maximal accepté : une notification pèse quelques kilooctets. */
const MAX_BODY_BYTES = 64 * 1024;

type Payload = {
  type?: unknown;
  data?: {
    email_id?: unknown;
    to?: unknown;
    bounce?: { type?: unknown };
  };
};

/**
 * Notifications du fournisseur d'envoi.
 *
 * Elles transforment les statistiques de campagne en mesures réelles :
 * « distribué », « rejeté », « plainte » cessent d'être des zéros faute
 * d'information et deviennent des faits rapportés par le fournisseur.
 *
 * Un rejet dur ou une plainte ferment définitivement l'adresse côté abonné :
 * continuer d'écrire à une adresse qui rebondit abîme la réputation du domaine
 * expéditeur, et réécrire à quelqu'un qui a signalé un abus est pire encore.
 *
 * **Aucune requête non signée n'est traitée.** Sans `RESEND_WEBHOOK_SECRET`,
 * le point d'entrée refuse tout : un webhook ouvert permettrait à n'importe
 * qui de faire cesser les envois vers une adresse de son choix.
 */
export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload trop volumineux." }, { status: 413 });
  }

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload trop volumineux." }, { status: 413 });
  }

  const check = verifyWebhookSignature({
    secret: process.env.RESEND_WEBHOOK_SECRET,
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signatureHeader: request.headers.get("svix-signature"),
    body,
  });

  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 401 });

  let payload: Payload;
  try {
    payload = JSON.parse(body) as Payload;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const type = payload.type;
  // Un événement non traité est acquitté : le fournisseur ne doit pas
  // réessayer indéfiniment pour un type dont nous ne faisons rien.
  if (!isHandledEvent(type)) return NextResponse.json({ ok: true, ignored: true });

  const messageId = typeof payload.data?.email_id === "string" ? payload.data.email_id : "";
  if (!messageId) return NextResponse.json({ ok: true, ignored: true });

  if (!(await tryConnectToDatabase())) {
    // 503 : le fournisseur réessaiera plutôt que de considérer l'événement
    // comme livré.
    return NextResponse.json({ error: "Base indisponible." }, { status: 503 });
  }

  const now = new Date();

  const update =
    type === "email.delivered"
      ? { status: "delivered", deliveredAt: now }
      : type === "email.bounced"
        ? { status: "bounced", bouncedAt: now }
        : type === "email.complained"
          ? { status: "complained" }
          : null;

  // Un retard de distribution n'est pas un échec : rien à écrire.
  if (!update) return NextResponse.json({ ok: true, ignored: true });

  const recipient = await NewsletterRecipientModel.findOneAndUpdate(
    { providerMessageId: messageId },
    { $set: update },
    { new: true },
  ).lean();

  if (!recipient) return NextResponse.json({ ok: true, ignored: true });

  if (type === "email.bounced" || type === "email.complained") {
    const subscriberStatus = type === "email.bounced" ? "bounced" : "complained";
    await NewsletterSubscriberModel.updateOne(
      { _id: (recipient as { subscriberId?: unknown }).subscriberId },
      {
        $set: {
          status: subscriberStatus,
          lastActivityAt: now,
          lastError:
            type === "email.bounced"
              ? String(payload.data?.bounce?.type ?? "Rejet rapporté par le fournisseur.")
              : "Signalement d'abus rapporté par le fournisseur.",
        },
      },
    );
  }

  return NextResponse.json({ ok: true });
}
