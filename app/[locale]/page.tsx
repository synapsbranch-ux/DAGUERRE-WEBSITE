import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AboutPreview } from "@/components/sections/AboutPreview";
import { BlogPreview } from "@/components/sections/BlogPreview";
import { ContactCTA } from "@/components/sections/ContactCTA";
import { DataklePreview } from "@/components/sections/DataklePreview";
import { EngagementPreview } from "@/components/sections/EngagementPreview";
import { Hero } from "@/components/sections/Hero";
import { ProjectsPreview } from "@/components/sections/ProjectsPreview";
import { ResultsPreview } from "@/components/sections/ResultsPreview";
import { SkillsPreview } from "@/components/sections/SkillsPreview";
import { DataDecisions } from "@/components/sections/DataDecisions";
import {
  getFeaturedProjects,
  getHomeSections,
  getProfile,
  getRecentPosts,
  getServices,
  getSiteSettings,
  getSkills,
} from "@/lib/content";
import { getDictionary, getDictionaryFor, getLocale } from "@/lib/dictionaries";
import { isLocale } from "@/lib/i18n";
import { createMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import type { HomeSection } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const settings = await getSiteSettings(locale);
  await getDictionaryFor(locale);

  return createMetadata({
    locale,
    routeKey: "home",
    title: settings?.title || siteConfig.title,
    description: settings?.description || siteConfig.description,
    image: settings?.defaultOgImage,
    absoluteTitle: true,
  });
}

/**
 * Accueil.
 *
 * L'ordre et la visibilité des bandes viennent de la collection `HomeSection` ;
 * leur contenu vient des collections métier (projets et articles mis en avant,
 * profil, compétences, page Engagement). Sans `HomeSection` enregistrée, la
 * composition par défaut de la maquette s'applique.
 */

/** Ordre de repli, utilisé tant que le CMS ne pilote pas la composition. */
const defaultOrder = [
  "hero",
  "expertise",
  "data",
  "projects",
  "datakle",
  "results",
  "about",
  "engagement",
  "blog",
  "contact",
] as const;

export default async function Home() {
  const [locale, dict, projects, posts, profile, settings, sections, skills, services] =
    await Promise.all([
      getLocale(),
      getDictionary(),
      getFeaturedProjects(),
      getRecentPosts(3),
      getProfile(),
      getSiteSettings(),
      getHomeSections(),
      getSkills(),
      getServices(),
    ]);

  const byKey = new Map<string, HomeSection>(sections.map((section) => [section.key, section]));

  /** Une bande masquée dans le CMS n'est pas rendue du tout. */
  const visible = (key: string) => byKey.get(key)?.visible !== false;
  const section = (key: string) => byKey.get(key);

  const blocks: Record<string, ReactNode> = {
    hero: (
      <Hero
        key="hero"
        locale={locale}
        dict={dict}
        backgroundImage={settings?.heroImage ?? profile?.portrait}
        eyebrow={settings?.heroEyebrow}
        title={settings?.heroTitle}
        lead={settings?.heroLead}
      />
    ),
    data: <DataDecisions key="data" dict={dict} section={section("data")} />,
    projects: (
      <ProjectsPreview
        key="projects"
        locale={locale}
        dict={dict}
        projects={projects}
        section={section("projects")}
      />
    ),
    results: (
      <ResultsPreview
        key="results"
        locale={locale}
        dict={dict}
        settings={settings}
        section={section("results")}
      />
    ),
    datakle: (
      <DataklePreview
        key="datakle"
        locale={locale}
        dict={dict}
        services={services}
        section={section("datakle")}
      />
    ),
    about: (
      <AboutPreview
        key="about"
        locale={locale}
        dict={dict}
        photo={section("about")?.image ?? profile?.portrait}
        section={section("about")}
      />
    ),
    engagement: (
      <EngagementPreview key="engagement" locale={locale} dict={dict} section={section("engagement")} />
    ),
    expertise: <SkillsPreview key="expertise" locale={locale} dict={dict} groups={skills} section={section("expertise")} />,
    blog: <BlogPreview key="blog" locale={locale} dict={dict} posts={posts} section={section("blog")} />,
    contact: <ContactCTA key="contact" locale={locale} dict={dict} fullBleed />,
  };

  const ordered = sections.length
    ? sections.map((entry) => entry.key)
    : [...defaultOrder];

  return <>{ordered.filter(visible).map((key) => blocks[key] ?? null)}</>;
}
