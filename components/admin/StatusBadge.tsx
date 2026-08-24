import { Badge } from "@/components/ui/badge";

const labels: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

/** Statut de publication d'un contenu éditorial, dans les listes du CMS. */
export function StatusBadge({ status }: { status: string }) {
  const variant = status === "published" ? "default" : status === "archived" ? "outline" : "secondary";
  return <Badge variant={variant}>{labels[status] ?? status}</Badge>;
}
