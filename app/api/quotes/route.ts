import { NextResponse } from "next/server";

import { tryConnectToDatabase } from "@/lib/db/client";
import { QuoteRequestModel, StoredFileModel } from "@/lib/db/models/platform";
import {
  quoteReceivedAdminEmail,
  quoteReceivedClientEmail,
} from "@/lib/email/templates";
import { adminNotificationAddress, publicUrl, sendTransactionalEmail } from "@/lib/email/service";
import { clientIp } from "@/lib/http";
import {
  MAX_ATTACHMENT_BYTES,
  checkFile,
  safeFilename,
  storePrivateFile,
} from "@/lib/media/files";
import { readPlatformSession } from "@/lib/platform/access";
import { isDuplicateKeyError, submissionKeyFrom } from "@/lib/platform/idempotency";
import { subscribeToNewsletter } from "@/lib/platform/newsletter";
import { nextQuoteNumber } from "@/lib/platform/numbers";
import { ensureQuoteConversation, logQuoteActivity } from "@/lib/platform/quotes";
import { CLAIM_TTL_SECONDS, createToken, tokenPurpose } from "@/lib/platform/tokens";
import { slidingWindow } from "@/lib/rate-limit";
import { adminUrl } from "@/lib/email/service";
import { quoteRequestInputSchema } from "@/lib/validation-platform";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Cinq pièces jointes suffisent à documenter une demande. */
const MAX_ATTACHMENTS = 5;

/**
 * Soumission d'une demande de devis.
 *
 * ## Un seul parcours
 *
 * Ce point d'entrée sert le formulaire public **et** celui de l'espace
 * client. La différence tient à la session : connecté, le dossier est
 * immédiatement rattaché au compte ; anonyme, un lien signé permet de le
 * réclamer en créant un compte, sans jamais dupliquer la demande.
 *
 * ## Idempotence
 *
 * Le formulaire tire un identifiant de soumission au hasard ; son empreinte
 * est stockée sous index unique. Un double-clic, une reprise réseau ou un
 * `POST` rejoué retrouvent la demande déjà créée et renvoient sa référence.
 *
 * ## Pièces jointes
 *
 * Elles partent dans le stockage privé, portée « client précis », rattachées
 * au dossier. Aucune n'est accessible sans autorisation, et le formulaire
 * prévient explicitement de ne pas y déposer de secrets.
 */
export async function POST(request: Request) {
  if (!slidingWindow(`quote:${clientIp(request)}`, 5, 30 * 60 * 1000)) {
    return NextResponse.json({ error: "Trop de demandes. Réessayez plus tard." }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Requête illisible." }, { status: 400 });

  let payload: unknown;
  try {
    payload = JSON.parse(String(form.get("payload") ?? "{}")) as unknown;
  } catch {
    return NextResponse.json({ error: "Données illisibles." }, { status: 400 });
  }

  const parsed = quoteRequestInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  // Piège à pourriel : réponse plausible, aucune écriture.
  if (data.website) return NextResponse.json({ quoteNumber: "", duplicate: false }, { status: 201 });

  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length > MAX_ATTACHMENTS) {
    return NextResponse.json({ error: `${MAX_ATTACHMENTS} pièces jointes au maximum.` }, { status: 400 });
  }

  // Les fichiers sont validés avant toute écriture : un dossier ne doit pas
  // exister avec des pièces à moitié acceptées.
  const prepared: { bytes: Buffer; filename: string; original: string; mime: string }[] = [];
  for (const file of files) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const check = checkFile(file, bytes, MAX_ATTACHMENT_BYTES);
    if (!check.ok) return NextResponse.json({ error: `${file.name} : ${check.reason}` }, { status: 400 });
    prepared.push({
      bytes,
      filename: safeFilename(file.name, check.extension),
      original: file.name.slice(0, 240),
      mime: file.type,
    });
  }

  if (!(await tryConnectToDatabase())) {
    return NextResponse.json(
      { error: "La demande n'a pas pu être enregistrée. Réessayez dans un instant." },
      { status: 503 },
    );
  }

  const session = await readPlatformSession();
  const userId = session?.user.id ?? "";

  const submissionKey = submissionKeyFrom(data.submissionId, [
    data.email,
    data.title,
    data.description.slice(0, 200),
  ]);

  const existing = (await QuoteRequestModel.findOne({ submissionKey })
    .select("_id quoteNumber")
    .lean()) as { _id: unknown; quoteNumber?: string } | null;

  if (existing) {
    return NextResponse.json(
      { id: String(existing._id), quoteNumber: String(existing.quoteNumber ?? ""), duplicate: true },
      { status: 200 },
    );
  }

  let quote;
  try {
    quote = await QuoteRequestModel.create({
      quoteNumber: await nextQuoteNumber(),
      userId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      phone: data.phone,
      serviceId: data.serviceId || null,
      serviceType: data.serviceType || "other",
      title: data.title,
      description: data.description,
      businessObjective: data.businessObjective,
      dataSources: data.dataSources,
      estimatedDataVolume: data.estimatedDataVolume,
      desiredDeliverables: data.desiredDeliverables,
      budgetRange: data.budgetRange,
      desiredStartDate: data.desiredStartDate ? new Date(data.desiredStartDate) : null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      locale: data.locale,
      status: "submitted",
      priority: "normal",
      submissionKey,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const duplicate = (await QuoteRequestModel.findOne({ submissionKey })
        .select("_id quoteNumber")
        .lean()) as { _id: unknown; quoteNumber?: string } | null;
      if (duplicate) {
        return NextResponse.json(
          { id: String(duplicate._id), quoteNumber: String(duplicate.quoteNumber ?? ""), duplicate: true },
          { status: 200 },
        );
      }
    }
    console.error("[devis] création impossible :", error);
    return NextResponse.json({ error: "La demande n'a pas pu être enregistrée." }, { status: 503 });
  }

  const quoteId = String(quote._id);
  const quoteNumber = String(quote.get("quoteNumber"));

  await logQuoteActivity(quoteId, "created", { id: userId, email: data.email, role: userId ? "customer" : "system" });

  for (const file of prepared) {
    try {
      const gridFsFileId = await storePrivateFile(file.bytes, file.filename, file.mime);
      await StoredFileModel.create({
        filename: file.filename,
        originalFilename: file.original,
        mimeType: file.mime,
        size: file.bytes.length,
        gridFsFileId,
        visibility: "specific_client",
        ownerUserId: userId,
        quoteRequestId: quoteId,
        label: file.original,
        uploadedBy: userId,
      });
      await logQuoteActivity(
        quoteId,
        "file_uploaded",
        { id: userId, email: data.email, role: userId ? "customer" : "system" },
        { filename: file.original },
      );
    } catch (error) {
      // Une pièce jointe perdue ne doit pas annuler la demande elle-même.
      console.error("[devis] pièce jointe non enregistrée :", error);
    }
  }

  if (userId) await ensureQuoteConversation(quote.toObject() as Record<string, unknown>);

  // Consentement marketing distinct : demander un devis n'abonne personne.
  if (data.newsletterOptIn) {
    await subscribeToNewsletter({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      source: "quote",
      locale: data.locale,
      userId: userId || undefined,
    }).catch(() => null);
  }

  const actionUrl = userId
    ? publicUrl("portalQuotes", data.locale, quoteId)
    : `${publicUrl("quoteClaim", data.locale)}?jeton=${encodeURIComponent(
        createToken(tokenPurpose.quoteClaim, quoteId, CLAIM_TTL_SECONDS),
      )}`;

  await sendTransactionalEmail(
    data.email,
    quoteReceivedClientEmail(data.locale, {
      quoteNumber,
      title: data.title,
      actionUrl,
      hasAccount: Boolean(userId),
    }),
  );

  const alert = adminNotificationAddress();
  if (alert) {
    await sendTransactionalEmail(
      alert,
      quoteReceivedAdminEmail("fr", {
        quoteNumber,
        title: data.title,
        clientName: `${data.firstName} ${data.lastName}`.trim(),
        clientEmail: data.email,
        company: data.companyName,
        adminUrl: adminUrl(`/admin/devis/${quoteId}`),
      }),
    );
  }

  return NextResponse.json(
    { id: quoteId, quoteNumber, duplicate: false, hasAccount: Boolean(userId) },
    { status: 201 },
  );
}
