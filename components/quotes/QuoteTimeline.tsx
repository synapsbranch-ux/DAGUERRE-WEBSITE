import { MilestoneStepper } from "@/components/ruixen/milestone-stepper";
import type { Locale } from "@/lib/i18n";
import { labelOf, quoteActivityLabels, quoteStatusLabels } from "@/lib/platform/enums";
import { formatDateTime } from "@/lib/platform/format";
import type { ActivityEntry } from "@/lib/platform/queries";

/**
 * Historique d'un dossier — Ruixen UI « Milestone Stepper ».
 *
 * Seuls les faits **réellement survenus** sont affichés : la frise ne montre
 * pas d'étapes futures grisées. Un dossier soumis hier n'a qu'un jalon, et
 * c'est l'information juste — laisser entrevoir « devis transmis » avant qu'il
 * ne le soit promettrait quelque chose que personne n'a décidé.
 *
 * Tous les jalons sont marqués accomplis (`currentMilestone` au-delà du
 * dernier) : ce sont des événements passés, pas une progression en cours.
 */
export function QuoteTimeline({
  activities,
  locale,
  emptyLabel,
}: {
  activities: ActivityEntry[];
  locale: Locale;
  emptyLabel: string;
}) {
  if (activities.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const milestones = activities.map((activity) => {
    const metadata = activity.metadata as { to?: unknown; from?: unknown; version?: unknown };
    const target = typeof metadata.to === "string" ? metadata.to : "";
    const version = typeof metadata.version === "number" ? metadata.version : null;

    const description = target
      ? labelOf(quoteStatusLabels, target, locale)
      : version
        ? `v${version}`
        : undefined;

    return {
      id: activity.id,
      title: labelOf(quoteActivityLabels, activity.type, locale),
      description,
      date: formatDateTime(activity.createdAt, locale),
    };
  });

  return (
    <MilestoneStepper
      milestones={milestones}
      currentMilestone={milestones.length + 1}
      variant="compact"
    />
  );
}
