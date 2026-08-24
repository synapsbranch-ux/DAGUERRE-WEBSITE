import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { tryConnectToDatabase } from "@/lib/db/client";
import {
  ContactMessageModel,
  PostModel,
  ProjectModel,
  ResearchModel,
  ServiceModel,
  SkillModel,
} from "@/lib/db/models";
import { messageStatusLabels, type MessageStatus } from "@/lib/messages";
import { formatDate } from "@/lib/utils";

type Counter = { label: string; href: string; total: number; detail: string };

const localized = (value: unknown) =>
  typeof value === "object" && value ? String((value as { fr?: string }).fr ?? "") : "";

/**
 * Tableau de bord.
 *
 * Les compteurs distinguent le total du publié : « 12 articles » ne dit rien,
 * « 12 articles dont 4 publiés » dit ce qu'il reste à faire.
 */
export default async function AdminHome() {
  const connected = await tryConnectToDatabase();

  if (!connected) {
    return (
      <>
        <p className="eyebrow">Administration</p>
        <h1 className="mt-2 text-4xl">Tableau de bord</h1>
        <p
          role="alert"
          className="mt-8 max-w-2xl rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          MongoDB est injoignable. Vérifiez <code>MONGODB_URI</code> puis rechargez la page : sans base,
          aucun contenu ne peut être lu ni enregistré.
        </p>
      </>
    );
  }

  const published = { status: "published" };

  const [
    posts,
    publishedPosts,
    projects,
    publishedProjects,
    services,
    publishedServices,
    research,
    publishedResearch,
    skills,
    activeSkills,
    messages,
    newMessages,
    recentPosts,
    recentMessages,
  ] = await Promise.all([
    PostModel.countDocuments(),
    PostModel.countDocuments(published),
    ProjectModel.countDocuments(),
    ProjectModel.countDocuments(published),
    ServiceModel.countDocuments(),
    ServiceModel.countDocuments(published),
    ResearchModel.countDocuments(),
    ResearchModel.countDocuments(published),
    SkillModel.countDocuments(),
    SkillModel.countDocuments({ enabled: true }),
    ContactMessageModel.countDocuments(),
    ContactMessageModel.countDocuments({ status: "new" }),
    PostModel.find().sort({ updatedAt: -1 }).limit(5).lean(),
    ContactMessageModel.find().sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const counters: Counter[] = [
    { label: "Articles", href: "/admin/articles", total: posts, detail: `${publishedPosts} publié${publishedPosts > 1 ? "s" : ""}` },
    { label: "Réalisations", href: "/admin/projets", total: projects, detail: `${publishedProjects} publiée${publishedProjects > 1 ? "s" : ""}` },
    { label: "Services", href: "/admin/services", total: services, detail: `${publishedServices} publié${publishedServices > 1 ? "s" : ""}` },
    { label: "Recherche", href: "/admin/research", total: research, detail: `${publishedResearch} publié${publishedResearch > 1 ? "s" : ""}` },
    { label: "Compétences", href: "/admin/skills", total: skills, detail: `${activeSkills} active${activeSkills > 1 ? "s" : ""}` },
    { label: "Messages", href: "/admin/messages", total: messages, detail: `${newMessages} non lu${newMessages > 1 ? "s" : ""}` },
  ];

  return (
    <>
      <p className="eyebrow">Administration</p>
      <h1 className="mt-2 text-4xl">Tableau de bord</h1>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {counters.map((counter) => (
          <li key={counter.label}>
            <Link
              href={counter.href}
              className="block rounded-lg border border-border p-5 transition-colors hover:bg-foreground/5"
            >
              <p className="text-sm text-muted-foreground">{counter.label}</p>
              <p className="mt-2 font-heading text-4xl">{counter.total}</p>
              <p className="mt-1 text-xs text-muted-foreground">{counter.detail}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="font-heading text-2xl">Articles récents</h2>
          {recentPosts.length ? (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {recentPosts.map((post) => (
                <li key={String(post._id)} className="flex items-center justify-between gap-3 py-3">
                  <Link href={`/admin/articles/${post._id}`} className="min-w-0 flex-1 truncate hover:underline">
                    {localized(post.title) || "Sans titre"}
                  </Link>
                  <StatusBadge status={String(post.status ?? "draft")} />
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(post.updatedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Aucun article. <Link href="/admin/articles/new" className="underline">Créer le premier</Link>.
            </p>
          )}
        </section>

        <section>
          <h2 className="font-heading text-2xl">Messages récents</h2>
          {recentMessages.length ? (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {recentMessages.map((message) => (
                <li key={String(message._id)} className="flex items-center justify-between gap-3 py-3">
                  <Link href={`/admin/messages/${message._id}`} className="min-w-0 flex-1 truncate hover:underline">
                    <span className="font-medium">{String(message.name)}</span>
                    <span className="text-muted-foreground"> — {String(message.subject || "sans objet")}</span>
                  </Link>
                  <Badge variant={message.status === "new" ? "default" : "outline"}>
                    {messageStatusLabels[String(message.status ?? "new") as MessageStatus] ?? String(message.status)}
                  </Badge>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(message.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Aucun message reçu.</p>
          )}
        </section>
      </div>

      <p className="mt-10 max-w-2xl text-sm text-muted-foreground">
        Les contenus longs s’écrivent en Markdown. Un contenu en brouillon ou archivé n’est jamais servi
        publiquement : une adresse pointant vers lui renvoie une page 404.
      </p>
    </>
  );
}
