import { requireAdminApi } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db/client";
import { NewsletterSubscriberModel } from "@/lib/db/models/platform";
import { subscriberFilter } from "@/lib/platform/admin-filters";
import { csvDocument } from "@/lib/platform/csv";

export const runtime = "nodejs";

const HEADER = [
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

const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : "");

/**
 * Export CSV des abonnés.
 *
 * L'export applique **les mêmes filtres** que la liste affichée : ce que
 * l'administrateur voit à l'écran est ce qu'il télécharge, sans surprise sur
 * le contenu du fichier.
 *
 * L'échappement des cellules — dont la neutralisation des formules de
 * tableur, qui feraient de l'export un vecteur d'attaque à l'ouverture —
 * vit dans `lib/platform/csv.ts`.
 */
export async function GET(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const url = new URL(request.url);
  await connectToDatabase();

  const rows = (await NewsletterSubscriberModel.find(subscriberFilter(url.searchParams))
    .sort({ createdAt: -1 })
    .limit(20_000)
    .lean()) as Record<string, unknown>[];

  const csv = csvDocument(
    HEADER,
    rows.map((row) => [
      row.email,
      row.firstName,
      row.lastName,
      row.status,
      row.source,
      row.locale,
      iso(row.consentAt),
      iso(row.confirmedAt),
      iso(row.unsubscribedAt),
      iso(row.createdAt),
    ]),
  );

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="abonnes-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
