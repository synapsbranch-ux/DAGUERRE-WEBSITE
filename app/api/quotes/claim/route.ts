import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/db/client";
import { QuoteRequestModel, StoredFileModel } from "@/lib/db/models/platform";
import { readJson } from "@/lib/http";
import { isDenied, requireSessionApi } from "@/lib/platform/access";
import { ensureQuoteConversation } from "@/lib/platform/quotes";
import { readToken, tokenPurpose } from "@/lib/platform/tokens";

/**
 * Rattachement d'une demande anonyme à un compte.
 *
 * Le jeton signé, reçu par courriel, prouve la possession de l'adresse ayant
 * soumis la demande. Deux garde-fous :
 *
 * - une demande **déjà rattachée** n'est pas volée : la mise à jour est
 *   conditionnée à `userId` vide ;
 * - le compte qui réclame doit porter la même adresse que la demande, sinon
 *   un lien transféré donnerait accès au dossier d'un tiers.
 *
 * Le rattachement transfère aussi la propriété des pièces jointes, sans quoi
 * le client ne pourrait pas relire ses propres documents.
 */
export async function POST(request: Request) {
  const guard = await requireSessionApi();
  if (isDenied(guard)) return guard.denied;

  const json = await readJson(request);
  if ("error" in json) return json.error;

  const token = (json.data as { token?: unknown })?.token;
  const quoteId = readToken(tokenPurpose.quoteClaim, typeof token === "string" ? token : null);
  if (!quoteId) return NextResponse.json({ error: "Lien expiré ou invalide." }, { status: 400 });

  await connectToDatabase();
  const user = guard.session.user;

  const quote = (await QuoteRequestModel.findById(quoteId).lean()) as Record<string, unknown> | null;
  if (!quote) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  if (String(quote.userId ?? "") === user.id) {
    return NextResponse.json({ ok: true, id: quoteId, already: true });
  }

  if (String(quote.email ?? "").toLowerCase() !== user.email) {
    return NextResponse.json(
      { error: "Ce lien correspond à une autre adresse courriel. Connectez-vous avec celle qui a soumis la demande." },
      { status: 403 },
    );
  }

  const updated = await QuoteRequestModel.findOneAndUpdate(
    { _id: quoteId, $or: [{ userId: "" }, { userId: null }, { userId: { $exists: false } }] },
    { $set: { userId: user.id } },
    { new: true },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Cette demande est déjà rattachée à un compte." }, { status: 409 });
  }

  await StoredFileModel.updateMany({ quoteRequestId: quoteId }, { $set: { ownerUserId: user.id } });
  await ensureQuoteConversation(updated as Record<string, unknown>);

  return NextResponse.json({ ok: true, id: quoteId, already: false });
}
