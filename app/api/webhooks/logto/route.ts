import { NextResponse } from "next/server";

import { tryConnectToDatabase } from "@/lib/db/client";
import { AppUserModel } from "@/lib/db/models/platform";
import {
  LOGTO_SIGNATURE_HEADER,
  isHandledLogtoEvent,
  verifyLogtoSignature,
} from "@/lib/auth/webhook";
import { normalizeRole } from "@/lib/platform/enums";

export const runtime = "nodejs";

/** Corps maximal accepté : une notification pèse quelques kilooctets. */
const MAX_BODY_BYTES = 64 * 1024;

type Payload = {
  event?: unknown;
  data?: {
    id?: unknown;
    primaryEmail?: unknown;
    name?: unknown;
    username?: unknown;
    isSuspended?: unknown;
  };
};

/**
 * Notifications de Logto sur le cycle de vie des comptes.
 *
 * Elles maintiennent le miroir `AppUser` à jour sans qu'aucune page
 * d'administration n'ait à interroger le fournisseur. Un compte créé dans la
 * console apparaît dans `/admin/clients` sans que personne se soit connecté.
 *
 * **Aucune requête non signée n'est traitée.** Sans
 * `LOGTO_WEBHOOK_SIGNING_KEY`, le point d'entrée refuse tout : un webhook
 * ouvert permettrait à n'importe qui de faire apparaître, renommer ou suspendre
 * un compte dans notre tableau de bord.
 *
 * Le miroir reste un cache d'affichage : ce que ces événements écrivent
 * n'accorde aucun droit. Le rôle effectif se lit dans la revendication signée
 * du jeton, à chaque requête.
 */
export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload trop volumineux." }, { status: 413 });
  }

  // Le corps **brut** : la signature porte sur les octets reçus, pas sur un
  // JSON re-sérialisé, dont l'ordre des clés et les espaces différeraient.
  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload trop volumineux." }, { status: 413 });
  }

  const check = verifyLogtoSignature({
    secret: process.env.LOGTO_WEBHOOK_SIGNING_KEY,
    signature: request.headers.get(LOGTO_SIGNATURE_HEADER),
    body,
  });

  if (!check.ok) return NextResponse.json({ error: check.reason }, { status: 401 });

  let payload: Payload;
  try {
    payload = JSON.parse(body) as Payload;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const event = payload.event;
  // Un événement non traité est acquitté : Logto ne doit pas réessayer
  // indéfiniment pour un type dont nous ne faisons rien.
  if (!isHandledLogtoEvent(event)) return NextResponse.json({ ok: true, ignored: true });

  const logtoId = typeof payload.data?.id === "string" ? payload.data.id : "";
  if (!logtoId) return NextResponse.json({ ok: true, ignored: true });

  if (!(await tryConnectToDatabase())) {
    // 503 : Logto réessaiera plutôt que de considérer l'événement comme livré.
    return NextResponse.json({ error: "Base indisponible." }, { status: 503 });
  }

  const now = new Date();

  if (event === "User.Deleted") {
    /*
     * Marqué, jamais effacé : les devis, messages et projets du compte restent
     * en base et doivent continuer d'afficher un nom dans l'historique.
     */
    await AppUserModel.updateOne(
      { logtoId },
      { $set: { deletedAt: now, syncedAt: now } },
      { upsert: false },
    );
    return NextResponse.json({ ok: true });
  }

  const data = payload.data ?? {};
  const email = typeof data.primaryEmail === "string" ? data.primaryEmail.toLowerCase() : "";
  const name = typeof data.name === "string" && data.name ? data.name : "";
  const username = typeof data.username === "string" ? data.username : "";

  await AppUserModel.updateOne(
    { logtoId },
    {
      $set: {
        ...(email ? { email } : {}),
        ...(name || username ? { name: name || username } : {}),
        isSuspended: data.isSuspended === true,
        deletedAt: null,
        syncedAt: now,
      },
      /*
       * Le rôle n'est pas écrit ici : ces événements ne le portent pas, et
       * l'écraser avec une valeur par défaut rétrograderait un administrateur
       * au premier changement de nom. Il est posé à la création, puis mis à
       * jour par l'écran de changement de rôle et le script de synchronisation.
       */
      $setOnInsert: { logtoId, role: normalizeRole(undefined) },
    },
    { upsert: true },
  );

  return NextResponse.json({ ok: true });
}
