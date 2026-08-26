import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminDatabaseError, AdminPageHeader } from "@/components/admin/AdminTable";
import { CampaignEditor } from "@/components/admin/CampaignEditor";
import { ConfirmAction } from "@/components/admin/ConfirmAction";
import { SendCampaign } from "@/components/admin/SendCampaign";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { tryConnectToDatabase } from "@/lib/db/client";
import { NewsletterCampaignModel } from "@/lib/db/models/platform";
import { isEmailConfigured } from "@/lib/email/provider";
import { validObjectId } from "@/lib/http";
import { campaignAudienceLabels, campaignStatusLabels } from "@/lib/platform/enums";
import { campaignStats } from "@/lib/platform/newsletter";
import { formatDate } from "@/lib/utils";

const BASE = "/admin/newsletter/campagnes";

/**
 * Fiche d'une campagne.
 *
 * Elle réunit l'édition, l'aperçu, le test, l'envoi et les statistiques
 * réelles. Ces dernières sont **comptées sur les destinataires** : ce que le
 * tableau affiche correspond à ce qui est effectivement parti, jamais à une
 * estimation.
 *
 * Les taux d'ouverture et de clic ne sont pas affichés : ils exigent un
 * traçage par pixel et par redirection qui n'est pas en place. Inventer ces
 * chiffres serait pire que de ne pas les avoir.
 */
export default async function CampaignDetailPage({ params }: PageProps<"/admin/newsletter/campagnes/[id]">) {
  await requireAdmin();

  const { id } = await params;
  if (!validObjectId(id)) notFound();

  const connected = await tryConnectToDatabase();
  if (!connected) return <AdminDatabaseError title="Campagne" />;

  const doc = (await NewsletterCampaignModel.findById(id).lean()) as Record<string, unknown> | null;
  if (!doc) notFound();

  const status = String(doc.status ?? "draft");
  const audienceType = String(doc.audienceType ?? "all_active");
  const stats = await campaignStats(id);

  const statLines: { label: string; value: number }[] = [
    { label: "Destinataires", value: stats.recipients },
    { label: "En file", value: stats.queued },
    { label: "Envoyés", value: stats.sent },
    { label: "Distribués", value: stats.delivered },
    { label: "Échecs", value: stats.failed },
    { label: "Rejets", value: stats.bounced },
    { label: "Plaintes", value: stats.complained },
    { label: "Ignorés", value: stats.skipped },
  ];

  const sendBlocker = !isEmailConfigured()
    ? "Envoi de courriel non configuré (RESEND_API_KEY)."
    : status === "sending"
      ? "Envoi déjà en cours."
      : status === "sent"
        ? "Cette campagne a déjà été envoyée."
        : undefined;

  return (
    <>
      <AdminPageHeader
        group="Marketing"
        title={String(doc.name ?? "Campagne")}
        description={String(doc.subject ?? "")}
        actions={
          <>
            <Button asChild variant="ghost">
              <Link href={BASE}>Retour</Link>
            </Button>
            {status === "draft" || status === "cancelled" ? (
              <ConfirmAction
                trigger="Supprimer"
                title="Supprimer ce brouillon ?"
                description="Le brouillon et sa file de destinataires sont effacés. Une campagne déjà envoyée ne peut pas être supprimée."
                confirmLabel="Supprimer"
                endpoint={`/api/admin/newsletter/campaigns/${id}`}
                redirectTo={BASE}
                variant="secondary"
              />
            ) : null}
            <SendCampaign
              campaignId={id}
              campaignName={String(doc.name ?? "")}
              audienceType={audienceType}
              audienceLabel={
                campaignAudienceLabels[audienceType as keyof typeof campaignAudienceLabels]?.fr ?? audienceType
              }
              disabledReason={sendBlocker}
            />
          </>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <Badge variant={status === "sent" ? "default" : "outline"}>
          {campaignStatusLabels[status as keyof typeof campaignStatusLabels]?.fr ?? status}
        </Badge>
        <span>Modifiée le {formatDate(doc.updatedAt)}</span>
        {doc.sentAt ? <span>Envoyée le {formatDate(doc.sentAt)}</span> : null}
        {doc.lastError ? (
          <span role="alert" className="text-destructive">
            {String(doc.lastError)}
          </span>
        ) : null}
      </div>

      {status === "sending" ? (
        <p role="status" className="mt-4 rounded-lg border border-border bg-[var(--plate)] p-3 text-sm">
          Envoi en cours. Rechargez la page pour suivre l&apos;avancement ; la file se vide par lots.
        </p>
      ) : null}

      {stats.recipients > 0 ? (
        <section className="mt-8">
          <h2 className="font-heading text-xl">Statistiques d&apos;envoi</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {statLines.map((line) => (
              <div key={line.label} className="rounded-lg border border-border p-4">
                <dt className="text-xs text-muted-foreground">{line.label}</dt>
                <dd className="mt-1 font-heading text-2xl">{line.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 max-w-[70ch] text-xs text-muted-foreground">
            Les ouvertures et les clics ne sont pas mesurés : ils exigeraient un pixel de suivi et une
            redirection des liens, qui ne sont pas en place.
          </p>
        </section>
      ) : null}

      <CampaignEditor
        sendable
        initial={{
          id,
          name: String(doc.name ?? ""),
          subject: String(doc.subject ?? ""),
          previewText: String(doc.previewText ?? ""),
          content: String(doc.content ?? ""),
          locale: String(doc.locale) === "en" ? "en" : "fr",
          audienceType,
          status,
        }}
      />
    </>
  );
}
