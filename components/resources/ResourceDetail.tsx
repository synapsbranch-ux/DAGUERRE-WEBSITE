import Link from "next/link";

import { ArticleMarkdown } from "@/components/sections/ArticleMarkdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditorialImage } from "@/components/motion/EditorialImage";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import { optionalImage } from "@/lib/media/resolve";
import { labelOf, resourceTypeLabels } from "@/lib/platform/enums";
import { formatDate } from "@/lib/platform/format";
import type { ResourceDetail as ResourceDetailData } from "@/lib/platform/queries";

/**
 * Fiche d'une ressource.
 *
 * Le bouton de téléchargement pointe vers `/api/resources/<id>/download` :
 * cette route revérifie publication, portée et droits avant de servir un
 * octet, puis enregistre le téléchargement. Le lien affiché n'accorde donc
 * aucun droit par lui-même — le partager ne partage rien.
 */
export function ResourceDetail({
  dict,
  locale,
  resource,
  signedIn,
  loginHref,
  backHref,
}: {
  dict: Dictionary;
  locale: Locale;
  resource: ResourceDetailData;
  signedIn: boolean;
  loginHref: string;
  backHref: string;
}) {
  const t = dict.platform.resources;
  const cover = optionalImage(resource.coverImage);
  const needsAccount = resource.visibility !== "public" && !signedIn;

  return (
    <article className="pb-16">
      <header className="border-b border-border py-12 sm:py-16">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{labelOf(resourceTypeLabels, resource.type, locale)}</Badge>
          {resource.categoryName ? <Badge variant="outline">{resource.categoryName}</Badge> : null}
        </div>

        <h1 className="mt-5 max-w-4xl font-heading text-4xl leading-[1.05] sm:text-5xl">
          {resource.title}
        </h1>

        {resource.description ? (
          <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-muted-foreground">
            {resource.description}
          </p>
        ) : null}

        <dl className="mt-7 flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
          {resource.publishedAt ? (
            <div className="flex gap-2">
              <dt>{t.published}</dt>
              <dd className="text-foreground">{formatDate(resource.publishedAt, locale)}</dd>
            </div>
          ) : null}
          <div className="flex gap-2">
            <dt>{t.downloads}</dt>
            <dd className="text-foreground">{resource.downloadCount}</dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-wrap gap-3">
          {needsAccount ? (
            <Button asChild>
              <Link href={loginHref}>{t.signInToDownload}</Link>
            </Button>
          ) : (
            <Button asChild>
              {/* Lien natif : le téléchargement n'est pas une navigation client. */}
              <a href={`/api/resources/${resource.id}/download`} rel="nofollow">
                {dict.platform.common.download}
              </a>
            </Button>
          )}
          <Button asChild variant="secondary">
            <Link href={backHref}>{t.title}</Link>
          </Button>
        </div>
      </header>

      {cover ? (
        <EditorialImage
          src={cover}
          alt=""
          priority
          sizes="(min-width: 1024px) 70vw, 96vw"
          className="mt-10 aspect-[16/9] w-full"
        />
      ) : null}

      {resource.body ? (
        <div className="py-12">
          <ArticleMarkdown
            body={resource.body}
            className="prose max-w-3xl text-foreground prose-p:leading-relaxed"
          />
        </div>
      ) : null}
    </article>
  );
}
