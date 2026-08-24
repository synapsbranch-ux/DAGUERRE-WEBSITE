"use client";

import { PostForm } from "@/components/admin/forms/PostForm";
import { ProjectForm } from "@/components/admin/forms/ProjectForm";
import { ServiceForm } from "@/components/admin/forms/ServiceForm";
import { ResearchForm } from "@/components/admin/forms/ResearchForm";
import { SkillForm } from "@/components/admin/forms/SkillForm";
import { SocialLinkForm } from "@/components/admin/forms/SocialLinkForm";
import { MediaForm } from "@/components/admin/forms/MediaForm";
import type { AdminDoc } from "@/components/admin/forms/types";

/**
 * Aiguillage vers le formulaire métier d'une ressource.
 *
 * Ce n'est pas un éditeur générique : chaque ressource a son composant, ses
 * champs et sa validation. Ce fichier ne fait que choisir lequel monter, pour
 * que les pages `new` et `[id]` n'aient pas à connaître les sept formulaires.
 */
export function ResourceForm({
  resource,
  id,
  initial,
}: {
  resource: string;
  id?: string;
  initial?: AdminDoc;
}) {
  switch (resource) {
    case "posts":
      return <PostForm id={id} initial={initial} />;
    case "projects":
      return <ProjectForm id={id} initial={initial} />;
    case "services":
      return <ServiceForm id={id} initial={initial} />;
    case "research":
      return <ResearchForm id={id} initial={initial} />;
    case "skills":
      return <SkillForm id={id} initial={initial} />;
    case "social":
      return <SocialLinkForm id={id} initial={initial} />;
    case "media":
      // Un média se crée par téléversement ou par URL, jamais par ce formulaire.
      return id && initial ? <MediaForm id={id} initial={initial} /> : null;
    default:
      return null;
  }
}
