import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ResourceForm } from "@/components/admin/forms/ResourceForm";
import { requireAdmin } from "@/lib/admin";
import { creatableResources } from "@/lib/admin-content";
import { findSection } from "@/lib/admin-sections";

export default async function NewContent({ params }: PageProps<"/admin/[section]/new">) {
  await requireAdmin();
  const { section } = await params;

  const item = findSection(section);
  if (!item || item.kind !== "collection" || !creatableResources.includes(item.resource)) notFound();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">{item.label}</p>
          <h1 className="mt-2 text-4xl">Créer</h1>
        </div>
        <Button asChild variant="secondary">
          <Link href={`/admin/${section}`}>Retour à la liste</Link>
        </Button>
      </div>

      <div className="mt-8">
        <ResourceForm resource={item.resource} />
      </div>
    </>
  );
}
