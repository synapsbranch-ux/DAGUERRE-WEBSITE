import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { NewsletterSubscriberModel } from "@/lib/db/models/platform";
import { subscriberFilter } from "@/lib/platform/admin-filters";

export const runtime = "nodejs";

/**
 * Export CSV des abonnés.
 *
 * L'export applique **les mêmes filtres** que la liste affichée : ce que
 * l'administrateur voit à l'écran est ce qu'il télécharge, sans surprise sur
 * le contenu du fichier.
 *
 * Les champs commençant par `=`, `+`, `-` ou `@` sont préfixés d'une
 * apostrophe : sans cela, un tableur interpréterait un nom comme
 * `=1+1` comme une formule — c'est l'injection de formule CSV, un vecteur
 * classique d'exfiltration à l'ouverture du fichier.
 */
function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const url = new URL(request.url);
  await connectToDatabase();

  const rows = (await NewsletterSubscriberModel.find(subscriberFilter(url.searchParams))
    .sort({ createdAt: -1 })
    .limit(20_000)
    .lean()) as Record<string, unknown>[];

  const header = [
    "email",
    "prenom",
    "nom",
    "statut",
    "source",
    "langue",
    "consentement",
    "confirmation",
    "desabonnement",
    "inscription",
  ];

  const body = rows.map((row) =>
    [
      row.email,
      row.firstName,
      row.lastName,
      row.status,
      row.source,
      row.locale,
      row.consentAt instanceof Date ? row.consentAt.toISOString() : "",
      row.confirmedAt instanceof Date ? row.confirmedAt.toISOString() : "",
      row.unsubscribedAt instanceof Date ? row.unsubscribedAt.toISOString() : "",
      row.createdAt instanceof Date ? row.createdAt.toISOString() : "",
    ]
      .map(csvCell)
      .join(","),
  );

  // Le BOM fait ouvrir le fichier en UTF-8 par Excel sous Windows, qui
  // supposerait sinon un encodage local et abîmerait les accents.
  const csv = `﻿${[header.map(csvCell).join(","), ...body].join("\r\n")}\r\n`;

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="abonnes-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
