import type { StaticImageData } from "next/image";

import accessExcelAutomation from "@/public/images/editorial/37-access-excel-automation.webp";
import agronomyFoundation from "@/public/images/editorial/29-agronomy-foundation.webp";
import analyticalStrategy from "@/public/images/editorial/34-analytical-strategy.webp";
import dataToDecisions from "@/public/images/editorial/03-data-to-decisions.webp";
import datakleFounder from "@/public/images/editorial/28-datakle-founder.webp";
import datakleHero from "@/public/images/editorial/10-datakle-hero.webp";
import decisionSupport from "@/public/images/editorial/33-decision-support-realtime.webp";
import economicsSpecialization from "@/public/images/editorial/30-economics-specialization.webp";
import efficiencyOptimization from "@/public/images/editorial/35-efficiency-optimization.webp";
import engagementEducation from "@/public/images/editorial/15-engagement-education.webp";
import haitiData from "@/public/images/editorial/14-haiti-data.webp";
import haitiDataImpact from "@/public/images/editorial/38-haiti-data-impact.webp";
import haitiQuebec from "@/public/images/editorial/25-haiti-quebec-personal.webp";
import haitiToQuebec from "@/public/images/editorial/05-haiti-to-quebec.webp";
import heroBackgroundData from "@/public/images/editorial/02-hero-background-data.webp";
import heroExecutive from "@/public/images/editorial/24-hero-executive.webp";
import mbaAchievement from "@/public/images/editorial/26-mba-achievement.webp";
import monitoringEvaluation from "@/public/images/editorial/31-monitoring-evaluation.webp";
import multidisciplinaryJourney from "@/public/images/editorial/04-multidisciplinary-journey.webp";
import openGraphGlobal from "@/public/images/editorial/23-open-graph-global.webp";
import powerBiProject from "@/public/images/editorial/36-powerbi-project.webp";
import professionalAnalyst from "@/public/images/editorial/27-professional-analyst.webp";
import research from "@/public/images/editorial/06-research.webp";
import rigorousResearch from "@/public/images/editorial/32-rigorous-research.webp";
import originalDaguerreFsa from "@/public/images/editorial/original-01-daguerre-fsa-ulaval.jpg";
import originalMbaDiploma from "@/public/images/editorial/original-02-mba-diploma.jpg";
import originalGraduationPortrait from "@/public/images/editorial/original-03-graduation-portrait.jpg";
import originalProfessionalPortrait from "@/public/images/editorial/original-04-professional-portrait.jpg";
import originalUniversityGroup from "@/public/images/editorial/original-05-university-group.jpg";
import originalUniversityCampus from "@/public/images/editorial/original-06-university-campus.jpg";
import originalColleaguesEvent from "@/public/images/editorial/original-07-colleagues-event.jpg";
import originalUniversityColleagues from "@/public/images/editorial/original-08-university-colleagues.jpg";

export type ImageSource = StaticImageData | string;

export type StaticSiteAsset = {
  driveId: string;
  filename: string;
  image: StaticImageData;
  alt: string;
  usage: readonly string[];
};

function asset(
  driveId: string,
  filename: string,
  image: StaticImageData,
  alt: string,
  usage: readonly string[],
): StaticSiteAsset {
  return { driveId, filename, image, alt, usage };
}

/**
 * Manifeste exhaustif des 32 sources du dossier Drive audité.
 * Les imports statiques donnent à Next les dimensions intrinsèques et un hash
 * immuable. Les visuels éditoriaux sont versionnés en WebP : les PNG d'origine
 * restent hors dépôt (voir `.gitignore`) et se régénèrent via
 * `scripts/compress-images.mjs`.
 */
export const siteAssets = {
  heroExecutive: asset("1ulD3VmDYty7frnenoRJGkYqsOg7KKndt", "24-hero-executive.webp", heroExecutive, "Jacques-Daguerre dans un environnement analytique bleu nuit", ["home hero"]),
  heroData: asset("1BCp_gPNgB9kGsm3x8yIRGwR7iKUVoevy", "02-hero-background-data.webp", heroBackgroundData, "Visualisation de données", ["hero backdrop"]),
  dataDecisions: asset("1KD8F9joXnlbwiYUXi2GEsDneQYWgzovM", "03-data-to-decisions.webp", dataToDecisions, "Équipe analysant des données pour guider une décision", ["home method"]),
  journey: asset("1tQIB-nXXaTT3mQq-fUgCFQBrMyAzJ-SK", "04-multidisciplinary-journey.webp", multidisciplinaryJourney, "Parcours multidisciplinaire", ["about"]),
  haitiToQuebec: asset("1QSAYPy_eOQ0g4xgo-iGKBNC7LkuWqAFO", "05-haiti-to-quebec.webp", haitiToQuebec, "Trajectoire d’Haïti au Québec", ["about"]),
  haitiQuebec: asset("1TZf5hRzotCcYR5iEkTIFd9sCM84oDpDG", "25-haiti-quebec-personal.webp", haitiQuebec, "Parcours professionnel entre Haïti et le Québec", ["about"]),
  research: asset("1zFzEpzIDfbpdgjXxgAe14sd7GQZELy4n", "06-research.webp", research, "Recherche et méthodes analytiques", ["research"]),
  datakle: asset("1O6JTKFaZankIZs3oXRnqx5WRQrNBKCt2", "10-datakle-hero.webp", datakleHero, "Atelier stratégique Datakle", ["home Datakle", "Datakle"]),
  haitiData: asset("1F9ejkzI7oTuZzkbeagM4DVWoRuw2TlhN", "14-haiti-data.webp", haitiData, "Données au service d’Haïti", ["Datakle", "engagement"]),
  engagement: asset("1_95ckaW4bu_UXbexe-1pRMMd9s3fVaQF", "15-engagement-education.webp", engagementEducation, "Atelier de formation et de partage", ["home engagement", "engagement"]),
  openGraph: asset("1de_UDFF3w9hl-8xm_Sa4ztFZfb3TghCu", "23-open-graph-global.webp", openGraphGlobal, "Daguerre — données et décision", ["open graph"]),
  mba: asset("1qOGSsIvQxXAVnunMmRIRTFYQJRiG388d", "26-mba-achievement.webp", mbaAchievement, "Parcours MBA en analytique d’affaires", ["about"]),
  professionalAnalyst: asset("1wwlS9DvGR8tSX_kFvB7gdZF1mt8vdi3u", "27-professional-analyst.webp", professionalAnalyst, "Jacques-Daguerre, analyste professionnel", ["home about", "about"]),
  datakleFounder: asset("1yU5Su_1JDQrm_ubebpeny6j0Yq2BM7tc", "28-datakle-founder.webp", datakleFounder, "Fondateur de Datakle", ["Datakle"]),
  agronomy: asset("1hKT19ha1AdlvXlEzkZ_G0dFohXMQep56", "29-agronomy-foundation.webp", agronomyFoundation, "Fondations en agronomie", ["about timeline"]),
  economics: asset("1pfO-otl64o3bhFozB2_8mFeKYzFWdBYN", "30-economics-specialization.webp", economicsSpecialization, "Spécialisation en économie", ["about timeline"]),
  monitoring: asset("10N53WvQgO9HbzT0QmGGgEBtRxKF39tSc", "31-monitoring-evaluation.webp", monitoringEvaluation, "Suivi et évaluation", ["about timeline"]),
  rigorousResearch: asset("1y-AL9is7_-iB6aRl3r2YtkP6ofzX3T54", "32-rigorous-research.webp", rigorousResearch, "Recherche rigoureuse", ["research", "about"]),
  decision: asset("1sZZerq1trXEt6CiVKc_VMPLPs1lwmB5u", "33-decision-support-realtime.webp", decisionSupport, "Aide à la décision en temps réel", ["about"]),
  strategy: asset("1ZBNQMUfKmX6OZzCCJ-pFm-nA4_cIm6AT", "34-analytical-strategy.webp", analyticalStrategy, "Stratégie analytique", ["about"]),
  efficiency: asset("18fcTlbvyBqLhlzqm7RAW7mUVsYksvNLT", "35-efficiency-optimization.webp", efficiencyOptimization, "Efficience et optimisation", ["about"]),
  powerBi: asset("1yIfSHC26SgW_5fVKiZLATb3y1C_B_QY6", "36-powerbi-project.webp", powerBiProject, "Projet de tableau de bord Power BI", ["projects"]),
  automation: asset("1CjBs0zo17c0sufBW8kxg-PKlKpFBp65U", "37-access-excel-automation.webp", accessExcelAutomation, "Automatisation Access et Excel", ["projects"]),
  impact: asset("1NwjpVBq83O8UOThbJp2IMpaHeH7AO0Qj", "38-haiti-data-impact.webp", haitiDataImpact, "Impact des données en Haïti", ["projects", "engagement"]),
  originalDaguerreFsa: asset("10x5DQ6nnAageFTewC8Jp0B5e302jQPLd", "original-01-daguerre-fsa-ulaval.jpg", originalDaguerreFsa, "Jacques-Daguerre à la Faculté des sciences de l’agriculture et de l’alimentation", ["about", "education"]),
  originalMbaDiploma: asset("1ZXVUF7DhEsO06nBiuDyf_sNa8rbxpZU2", "original-02-mba-diploma.jpg", originalMbaDiploma, "Diplôme de MBA en analytique d’affaires", ["about", "credentials"]),
  originalGraduationPortrait: asset("1MjpotyHybqH3ltQUNIEcGCluDHdqBOvx", "original-03-graduation-portrait.jpg", originalGraduationPortrait, "Portrait de fin d’études de Jacques-Daguerre", ["about"]),
  originalProfessionalPortrait: asset("12DISDlvgaHPUQE5qHJ_do4Opvs6sq2pJ", "original-04-professional-portrait.jpg", originalProfessionalPortrait, "Portrait professionnel de Jacques-Daguerre", ["home about", "about"]),
  originalUniversityGroup: asset("19Z5cKaWAV8YHJi3NIp4r5Q2Q_wSrR1_o", "original-05-university-group.jpg", originalUniversityGroup, "Groupe universitaire lors d’une activité académique", ["about", "education"]),
  originalUniversityCampus: asset("1hfpsoK1OD5qCUGg6gwctGXD1LQN28vF0", "original-06-university-campus.jpg", originalUniversityCampus, "Campus universitaire au Québec", ["about"]),
  originalColleaguesEvent: asset("1nB7RQGPo2JbtPnNgPJ74Vo8DhwQxftL_", "original-07-colleagues-event.jpg", originalColleaguesEvent, "Collègues réunis lors d’un événement", ["engagement", "about"]),
  originalUniversityColleagues: asset("1CVF_U_ZJfcJegDCro2w2Bg8qrQeEVFpc", "original-08-university-colleagues.jpg", originalUniversityColleagues, "Jacques-Daguerre avec des collègues universitaires", ["about", "education"]),
} as const;

const assetsByDriveId = new Map(
  Object.values(siteAssets).map((entry) => [entry.driveId, entry] as const),
);

/** Extrait un ID des principales formes d’URL Google Drive. */
export function driveIdFromUrl(value: string): string | null {
  if (!/(?:drive\.google\.com|googleusercontent\.com)/i.test(value)) return null;

  try {
    const url = new URL(value);
    const queryId = url.searchParams.get("id");
    if (queryId) return queryId;
  } catch {
    // Les anciennes valeurs CMS peuvent être partielles : le motif /d/ reste utile.
  }

  return value.match(/\/d\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
}

/** Import local correspondant à un identifiant Drive rapatrié, s’il existe. */
export function localAssetFor(driveId: string): StaticImageData | undefined {
  return assetsByDriveId.get(driveId)?.image;
}

/**
 * Remplace silencieusement une ancienne URL Drive connue par son import local.
 * Les chemins `/api/media/...` et les autres URLs CMS restent inchangés.
 */
export function resolveImageSource(source: ImageSource | null | undefined, fallback: StaticImageData): ImageSource {
  if (!source) return fallback;
  return resolveKnownImageSource(source);
}

export function resolveKnownImageSource(source: ImageSource): ImageSource {
  if (typeof source !== "string") return source;
  const driveId = driveIdFromUrl(source);
  return (driveId ? assetsByDriveId.get(driveId)?.image : undefined) ?? source;
}

export function isUnconfiguredRemoteImage(source: ImageSource): source is string {
  return typeof source === "string" && /^https?:\/\//i.test(source);
}

export const editorialAssets = {
  hero: { src: siteAssets.heroExecutive.image, alt: siteAssets.heroExecutive.alt },
  data: { src: siteAssets.dataDecisions.image, alt: siteAssets.dataDecisions.alt },
  haitiQuebec: { src: siteAssets.haitiQuebec.image, alt: siteAssets.haitiQuebec.alt },
  datakle: { src: siteAssets.datakle.image, alt: siteAssets.datakle.alt },
  engagement: { src: siteAssets.engagement.image, alt: siteAssets.engagement.alt },
  research: { src: siteAssets.research.image, alt: siteAssets.research.alt },
} as const;
