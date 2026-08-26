import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmAction } from "@/components/admin/ConfirmAction";
import { CopyUrlButton } from "@/components/admin/CopyUrlButton";
import { MediaUpload } from "@/components/admin/MediaUpload";
import { SettingsForm } from "@/components/admin/forms/SettingsForm";
import { ProfileForm } from "@/components/admin/forms/ProfileForm";
import { HomepageForm } from "@/components/admin/forms/HomepageForm";
import { AboutPageForm } from "@/components/admin/forms/AboutPageForm";
import { DataklePageForm } from "@/components/admin/forms/DataklePageForm";
import { EngagementPageForm } from "@/components/admin/forms/EngagementPageForm";
import { CvPageForm } from "@/components/admin/forms/CvPageForm";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { ContactMessageModel } from "@/lib/db/models";
import { adminResources, creatableResources, type AdminResourceKey } from "@/lib/admin-content";
import { findSection } from "@/lib/admin-sections";
import { messageStatusLabels, type MessageStatus } from "@/lib/messages";
import { formatDate } from "@/lib/utils";

type Doc = Record<string, unknown>;

const localized = (value: unknown) =>
  typeof value === "object" && value ? String((value as { fr?: string }).fr ?? "") : "";

/** Titre lisible d'une fiche, quelle que soit la ressource. */
function titleOf(doc: Doc): string {
  return (
    localized(doc.title) ||
    (typeof doc.name === "string" ? doc.name : "") ||
    (typeof doc.platform === "string" ? doc.platform : "") ||
    (typeof doc.filename === "string" ? doc.filename : "") ||
    "Sans titre"
  );
}

/** Filtre de recherche simple sur les champs qui portent un nom. */
function searchFilter(query: string): Doc {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = { $regex: escaped, $options: "i" };
  return {
    $or: [
      { "title.fr": regex },
      { "title.en": regex },
      { "slug.fr": regex },
      { name: regex },
      { slug: regex },
      { platform: regex },
      { filename: regex },
      { category: regex },
    ],
  };
}

const singletonForms = {
  settings: SettingsForm,
  profile: ProfileForm,
  about: AboutPageForm,
  datakle: DataklePageForm,
  engagement: EngagementPageForm,
  cv: CvPageForm,
} as const;

export default async function AdminSection({
  params,
  searchParams,
}: PageProps<"/admin/[section]">) {
  await requireAdmin();
  const { section } = await params;
  const item = findSection(section);
  if (!item) notFound();

  const query = typeof (await searchParams).q === "string" ? ((await searchParams).q as string).trim() : "";

  if (item.kind === "homepage") {
    return (
      <>
        <p className="eyebrow">Pages</p>
        <h1 className="mt-2 text-4xl">Accueil</h1>
        <HomepageForm />
      </>
    );
  }

  if (item.kind === "singleton") {
    const Form = singletonForms[item.singleton];
    return (
      <>
        <p className="eyebrow">{item.group}</p>
        <h1 className="mt-2 text-4xl">{item.label}</h1>
        <Form />
      </>
    );
  }

  if (item.kind === "messages") return <MessagesList query={query} />;

  /*
   * Les modules « custom » (devis, clients, infolettre…) ont leur propre route
   * statique, qui l'emporte sur ce segment dynamique. Y arriver signifie donc
   * une adresse incomplète — `/admin/newsletter` sans sous-section.
   */
  if (item.kind === "custom") notFound();

  return <CollectionList section={section} label={item.label} resource={item.resource} query={query} />;
}

async function CollectionList({
  section,
  label,
  resource,
  query,
}: {
  section: string;
  label: string;
  resource: AdminResourceKey;
  query: string;
}) {
  const connected = await tryConnectToDatabase();
  if (!connected) return <DatabaseError title={label} />;

  const records = (await adminResources[resource].model
    .find(query ? searchFilter(query) : {})
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean()) as Doc[];

  const isMedia = resource === "media";
  const archivable = adminResources[resource].archivable;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">CMS</p>
          <h1 className="mt-2 text-4xl">{label}</h1>
        </div>
        {creatableResources.includes(resource) ? (
          <Button asChild>
            <Link href={`/admin/${section}/new`}>Créer</Link>
          </Button>
        ) : null}
      </div>

      <SearchForm section={section} query={query} label={label} />

      {isMedia ? <MediaUpload /> : null}

      {records.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          {query ? `Aucun résultat pour « ${query} ».` : "Aucun élément pour le moment."}
        </p>
      ) : isMedia ? (
        <MediaGrid records={records} />
      ) : (
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {records.map((record) => {
            const id = String(record._id);
            return (
              <li key={id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <Link href={`/admin/${section}/${id}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                  {titleOf(record)}
                </Link>

                {typeof record.status === "string" ? <StatusBadge status={record.status} /> : null}
                {record.enabled === false ? <Badge variant="outline">Désactivé</Badge> : null}
                {record.featured === true ? <Badge variant="secondary">En avant</Badge> : null}

                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(record.updatedAt)}</span>

                <span className="flex shrink-0 items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/${section}/${id}`}>Modifier</Link>
                  </Button>
                  {archivable ? (
                    record.status === "archived" ? null : (
                      <ConfirmAction
                        trigger="Archiver"
                        title="Archiver ce contenu ?"
                        description="Il disparaît du site public mais reste modifiable ici, et peut être republié."
                        confirmLabel="Archiver"
                        endpoint={`/api/admin/content/${resource}/${id}`}
                        variant="ghost"
                        size="sm"
                      />
                    )
                  ) : (
                    <ConfirmAction
                      trigger="Supprimer"
                      title="Supprimer définitivement ?"
                      description="Cette suppression est irréversible."
                      confirmLabel="Supprimer définitivement"
                      endpoint={`/api/admin/content/${resource}/${id}`}
                      variant="ghost"
                      size="sm"
                    />
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function MediaGrid({ records }: { records: Doc[] }) {
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {records.map((record) => {
        const id = String(record._id);
        const src = record.provider === "gridfs" ? `/api/media/${id}` : String(record.externalUrl ?? "");
        return (
          <li key={id} className="rounded-lg border border-border p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- source arbitraire enregistrée dans le CMS */}
            <img src={src} alt="" className="h-36 w-full rounded-sm border border-border object-cover" />
            <p className="mt-2 truncate text-sm font-medium">{titleOf(record)}</p>
            <p className="truncate text-xs text-muted-foreground">
              {record.provider === "gridfs" ? "Téléversé" : "Externe"}
              {record.category ? ` · ${String(record.category)}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/admin/media/${id}`}>Modifier</Link>
              </Button>
              <CopyUrlButton url={src} size="sm" />
              <ConfirmAction
                trigger="Supprimer"
                title="Supprimer ce média ?"
                description={
                  record.provider === "gridfs"
                    ? "Le fichier et ses fragments seront effacés du stockage. Les pages qui l’utilisent perdront leur image."
                    : "La référence disparaît de la bibliothèque ; le fichier distant n’est pas touché."
                }
                confirmLabel="Supprimer définitivement"
                endpoint={`/api/admin/content/media/${id}`}
                variant="ghost"
                size="sm"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

async function MessagesList({ query }: { query: string }) {
  const connected = await tryConnectToDatabase();
  if (!connected) return <DatabaseError title="Messages" />;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const filter = query
    ? {
        $or: [
          { name: { $regex: escaped, $options: "i" } },
          { email: { $regex: escaped, $options: "i" } },
          { message: { $regex: escaped, $options: "i" } },
        ],
      }
    : {};

  const messages = (await ContactMessageModel.find(filter).sort({ createdAt: -1 }).limit(200).lean()) as Doc[];

  return (
    <>
      <p className="eyebrow">CMS</p>
      <h1 className="mt-2 text-4xl">Messages</h1>

      <SearchForm section="messages" query={query} label="les messages" />

      {messages.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          {query ? `Aucun résultat pour « ${query} ».` : "Aucun message reçu."}
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-border border-y border-border">
          {messages.map((message) => {
            const status = String(message.status ?? "new") as MessageStatus;
            return (
              <li key={String(message._id)} className="flex flex-wrap items-start gap-x-4 gap-y-2 py-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/messages/${message._id}`} className="font-medium hover:underline">
                    {String(message.name)}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {String(message.email)} · {String(message.subject || "sans objet")}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm">{String(message.message)}</p>
                </div>
                <Badge variant={status === "new" ? "default" : "outline"}>{messageStatusLabels[status] ?? status}</Badge>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(message.createdAt)}</span>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/admin/messages/${message._id}`}>Ouvrir</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/** Recherche par soumission GET : l'URL porte la requête, donc elle est partageable. */
function SearchForm({ section, query, label }: { section: string; query: string; label: string }) {
  return (
    <form action={`/admin/${section}`} method="get" className="mt-6 flex max-w-md items-end gap-2">
      <div className="grid flex-1 gap-1.5">
        <Label htmlFor="admin-search">Rechercher dans {label.toLowerCase()}</Label>
        <Input id="admin-search" name="q" type="search" defaultValue={query} placeholder="Titre, slug, nom…" />
      </div>
      <Button type="submit" variant="secondary">
        Rechercher
      </Button>
      {query ? (
        <Button asChild variant="ghost">
          <Link href={`/admin/${section}`}>Effacer</Link>
        </Button>
      ) : null}
    </form>
  );
}

function DatabaseError({ title }: { title: string }) {
  return (
    <>
      <h1 className="text-4xl">{title}</h1>
      <p role="alert" className="mt-8 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        MongoDB est injoignable. Vérifiez <code>MONGODB_URI</code> puis rechargez la page.
      </p>
    </>
  );
}
