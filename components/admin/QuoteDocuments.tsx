"use client";

import { useRouter } from "next/navigation";

import { FileUpload } from "@/components/admin/FileUpload";

export type QuoteDocument = { id: string; filename: string; size: string; createdAt: string };

/**
 * Documents rattachés à un dossier.
 *
 * Les fichiers déposés ici sont **privés** et portent la portée « client
 * précis » : ils suivent le dossier, donc son propriétaire y accède depuis son
 * espace, et personne d'autre. Ils ne sont jamais servis par une URL publique.
 */
export function QuoteDocuments({
  quoteId,
  ownerUserId,
  documents,
}: {
  quoteId: string;
  ownerUserId: string;
  documents: QuoteDocument[];
}) {
  const router = useRouter();

  return (
    <section className="grid gap-4 rounded-lg border border-border p-5">
      <h2 className="font-heading text-lg">Documents</h2>

      {documents.length > 0 ? (
        <ul className="grid gap-2 text-sm">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center gap-3">
              <a
                href={`/api/files/${document.id}`}
                rel="nofollow"
                className="min-w-0 flex-1 truncate underline underline-offset-4"
              >
                {document.filename}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">{document.size}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{document.createdAt}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun document pour ce dossier.</p>
      )}

      <FileUpload
        label="Déposer un document"
        hint="Visible du client rattaché à ce dossier, et de personne d'autre."
        visibility="specific_client"
        ownerUserId={ownerUserId}
        quoteRequestId={quoteId}
        onUploaded={() => router.refresh()}
      />
    </section>
  );
}
