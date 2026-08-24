import { MongoClient } from "mongodb";

/**
 * Contenu initial du CMS.
 *
 * **Idempotent** : tout passe par `$setOnInsert`, donc relancer le script
 * n'écrase jamais une valeur saisie depuis le tableau de bord. Il ne crée que
 * ce qui manque.
 *
 * Le script ne fabrique aucun projet, article ni chiffre : il installe la
 * structure (réglages, profil, composition de l'accueil, pages éditoriales,
 * compétences, médias déjà référencés) et reprend les textes rédigés qui
 * vivaient jusqu'ici en dur dans le code.
 *
 *   MONGODB_URI=… pnpm seed
 */

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) throw new Error("MONGODB_URI est requis.");

const client = new MongoClient(MONGODB_URI);
await client.connect();
const db = client.db();
const now = new Date();

/** Champ bilingue : le français fait foi, l'anglais est facultatif. */
const l = (fr, en = "") => ({ fr, en });

let created = 0;

/** Insère un document s'il n'existe pas encore, sans jamais toucher l'existant. */
async function ensure(collection, filter, document) {
  const result = await db
    .collection(collection)
    .updateOne(filter, { $setOnInsert: { ...document, createdAt: now, updatedAt: now } }, { upsert: true });
  if (result.upsertedCount) created += 1;
  return result;
}

/* ------------------------------------------------------------------ */
/* Réglages du site                                                    */
/* ------------------------------------------------------------------ */

await ensure("settings", { key: "site" }, {
  key: "site",
  brandName: "Daguerre",
  baseline: l("Données & décision", "Data & decision"),
  // Coordonnées volontairement vides : à renseigner dans Paramètres plutôt
  // que d'exposer une adresse ou un numéro fictif.
  email: "",
  phone: "",
  city: "Québec",
  region: "QC",
  country: "Canada",
  cvUrl: "",
  calendlyUrl: "",
  canonicalUrl: "",
  heroEyebrow: l("Analytique d’affaires · Datakle", "Business analytics · Datakle"),
  heroTitle: l(
    "La donnée devient utile quand elle mène à une décision claire.",
    "Data becomes useful when it leads to a clear decision.",
  ),
  heroLead: l(
    "J’aide les PME, ONG et institutions à structurer leurs données, automatiser leur pilotage et donner à leurs équipes les moyens d’agir.",
    "I help small businesses, NGOs and institutions structure their data, automate their reporting and give their teams the means to act.",
  ),
  // Vides : l'affichage retombe alors sur les illustrations locales du dépôt,
  // jamais sur une URL susceptible de disparaître.
  heroImage: "",
  defaultOgImage: "",
  title: l("Daguerre — Analyste de données & gestion de projet", "Daguerre — Data analyst & project management"),
  description: l(
    "Business intelligence, tableaux de bord, suivi-évaluation et recherche appliquée. Fondateur de Datakle.",
    "Business intelligence, dashboards, monitoring and evaluation, and applied research. Founder of Datakle.",
  ),
  footerText: l(
    "Des données structurées, des décisions plus claires et des équipes plus autonomes.",
    "Structured data, clearer decisions and more autonomous teams.",
  ),
  stats: [],
});

/* ------------------------------------------------------------------ */
/* Profil                                                              */
/* ------------------------------------------------------------------ */

await ensure("profiles", { key: "profile" }, {
  key: "profile",
  name: "Jacques-Daguerre",
  professionalTitle: l("Analyste de données et gestionnaire de projet", "Data analyst and project manager"),
  headline: l(
    "Transformer les données en décisions défendables.",
    "Turning data into decisions you can defend.",
  ),
  shortBio: l(
    "Analyste, chercheur et fondateur de Datakle.",
    "Analyst, researcher and founder of Datakle.",
  ),
  longBio: l(
    "Ingénieur-agronome spécialisé en économie et titulaire d’un MBA en analytique d’affaires, je relie la compréhension du terrain à la rigueur des données. Avec Datakle, j’accompagne les organisations du cadrage jusqu’au transfert de compétences, pour que les outils restent réellement utiles après leur livraison.",
    "Trained as an agricultural engineer specialised in economics and holding an MBA in business analytics, I connect field understanding with data rigour. Through Datakle, I support organisations from framing to skills transfer, so the tools stay genuinely useful after delivery.",
  ),
  email: "",
  location: "Québec, Canada",
  portrait: "",
  cvUrl: "",
  education: [
    { title: "Ingénieur-agronome", detail: "Formation initiale, spécialisation en économie" },
    { title: "MBA — analytique d’affaires", detail: "Analyse décisionnelle appliquée" },
  ],
  experience: [],
  certifications: [],
});

/* ------------------------------------------------------------------ */
/* Composition de l'accueil                                            */
/* ------------------------------------------------------------------ */

/**
 * Ordre et visibilité par défaut des bandes de l'accueil. Les textes restent
 * vides : chaque section retombe alors sur les libellés du dictionnaire, et
 * une surcharge saisie dans le CMS prend le dessus.
 */
const homeSections = ["hero", "data", "projects", "datakle", "about", "engagement", "expertise", "blog", "contact"];

for (const [index, key] of homeSections.entries()) {
  await ensure("homesections", { key }, {
    key,
    order: index,
    visible: true,
    eyebrow: l(""),
    title: l(""),
    lead: l(""),
    image: "",
  });
}

/* ------------------------------------------------------------------ */
/* Liens sociaux                                                       */
/* ------------------------------------------------------------------ */

/**
 * Les plateformes sont créées **désactivées** : leurs URL sont des racines de
 * service, pas de vrais profils. Renseignez l'adresse réelle puis activez le
 * lien dans le CMS — rien n'est publié tant que ce n'est pas fait.
 */
const socials = [
  ["LinkedIn", "https://www.linkedin.com/"],
  ["GitHub", "https://github.com/"],
  ["YouTube", "https://www.youtube.com/"],
  ["Medium", "https://medium.com/"],
  ["Instagram", "https://www.instagram.com/"],
];

for (const [index, [platform, url]] of socials.entries()) {
  await ensure("sociallinks", { platform }, {
    platform,
    label: platform,
    url,
    enabled: false,
    order: index,
  });
}

/* ------------------------------------------------------------------ */
/* Compétences                                                         */
/* ------------------------------------------------------------------ */

const slugify = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const skills = [
  ["Analyse de données", "Analyse", 0],
  ["Business intelligence", "Analyse", 1],
  ["Visualisation de données", "Analyse", 2],
  ["Power BI", "Outils", 0],
  ["SQL", "Outils", 1],
  ["Python", "Outils", 2],
  ["Excel et VBA", "Outils", 3],
  ["Gestion de projet", "Stratégie", 0],
  ["Suivi-évaluation", "Recherche", 0],
  ["Recherche appliquée", "Recherche", 1],
];

for (const [name, category, order] of skills) {
  await ensure("skills", { slug: slugify(name) }, {
    name,
    slug: slugify(name),
    category,
    description: l(""),
    order,
    featured: false,
    enabled: true,
    icon: "",
  });
}

/* ------------------------------------------------------------------ */
/* Pages éditoriales                                                   */
/* ------------------------------------------------------------------ */

await ensure("pages", { key: "about" }, {
  key: "about",
  title: l("Mon parcours", "My journey"),
  subtitle: l(
    "De l’agronomie à l’analytique d’affaires : un fil conducteur, comprendre les systèmes et outiller la décision.",
    "From agronomy to business analytics: one thread — understanding systems and equipping decisions.",
  ),
  body: l(
    "Ingénieur agronome de formation, j’ai d’abord appris à lire des systèmes vivants, leurs contraintes et leurs interdépendances. La spécialisation en économie a ensuite donné un cadre à cette curiosité : mesurer avec rigueur, mais toujours pour éclairer une action.\n\nLa gestion de projet et le suivi-évaluation m’ont conduit vers la recherche, puis l’analytique. Le MBA en analytique d’affaires a consolidé cette pratique : relier une question de terrain à une donnée fiable, à un récit compréhensible et à une décision assumée.\n\nD’Haïti au Québec, chez Desjardins et à travers Datakle, je construis des outils qui rendent les équipes plus autonomes. L’efficacité n’est pas seulement une affaire de tableaux de bord : elle naît d’objectifs clairs, d’écoute et d’amélioration continue. Je garde aussi la générosité intellectuelle de mon mentor, Yvan Blaise, comme boussole.",
    "Trained as an agricultural engineer, I first learned to read living systems, their constraints and their interdependencies. Economics then gave that curiosity a framework: measure rigorously, always to inform action.\n\nProject management and monitoring and evaluation led me to research, then analytics. An MBA in business analytics consolidated that practice: connecting a field question to reliable data, a clear story and an accountable decision.\n\nFrom Haiti to Quebec, at Desjardins and through Datakle, I build tools that make teams more autonomous. Efficiency is more than dashboards: it comes from clear goals, listening and continuous improvement. My mentor Yvan Blaise’s intellectual generosity remains a compass.",
  ),
  heroImage: "",
  timeline: [
    { period: "01", title: l("Ingénierie agronome & économie", "Agricultural engineering & economics"), detail: l(""), image: "" },
    { period: "02", title: l("Gestion de projet & suivi-évaluation", "Project management & evaluation"), detail: l(""), image: "" },
    { period: "03", title: l("Recherche & analytique", "Research & analytics"), detail: l(""), image: "" },
    { period: "04", title: l("MBA, stratégie & efficacité", "MBA, strategy & efficiency"), detail: l(""), image: "" },
    { period: "05", title: l("Haïti → Québec · Desjardins · Datakle", "Haiti → Quebec · Desjardins · Datakle"), detail: l(""), image: "" },
  ],
  sections: [],
  items: [],
  entries: [],
  certifications: [],
  media: [],
});

await ensure("pages", { key: "datakle" }, {
  key: "datakle",
  title: l("Datakle", "Datakle"),
  subtitle: l(
    "Rendre la donnée accessible, compréhensible et utile aux organisations.",
    "Making data accessible, understandable and useful to organisations.",
  ),
  body: l(
    "Datakle est une raison sociale dédiée à la démocratisation de la donnée : des services accessibles, conçus avec les équipes, pour les PME, ONG et institutions.",
    "Datakle is a business dedicated to data democratization: accessible services, built with teams, for small businesses, NGOs and institutions.",
  ),
  mission: l(
    "Accompagner les organisations qui n’ont pas d’équipe analytique, du cadrage de la question jusqu’au transfert de compétences.",
    "Support organisations without an analytics team, from framing the question through to skills transfer.",
  ),
  vision: l(
    "Faire de la donnée un levier concret de décision et de développement pour Haïti, sans dépendance durable à un fournisseur.",
    "Make data a practical lever for decision-making and development in Haiti, without lasting dependence on a vendor.",
  ),
  heroImage: "",
  items: [
    { title: l("Tableaux de bord", "Dashboards"), detail: l("Indicateurs cadrés, visuels lisibles, une source unique de vérité.", "Framed indicators, readable visuals, a single source of truth."), image: "", url: "" },
    { title: l("Qualité des données", "Data quality"), detail: l("Nettoyage, modélisation, contrôles automatiques.", "Cleaning, modelling, automated checks."), image: "", url: "" },
    { title: l("Automatisation", "Automation"), detail: l("Rapports récurrents produits sans intervention humaine.", "Recurring reports produced without manual work."), image: "", url: "" },
    { title: l("Formation et transfert", "Training and handover"), detail: l("Vos équipes deviennent autonomes sur l’outil livré.", "Your teams become autonomous with the delivered tool."), image: "", url: "" },
  ],
  sections: [],
  timeline: [],
  entries: [],
  certifications: [],
  media: [],
  ctaLabel: l("Prendre contact", "Get in touch"),
  ctaHref: "/contact",
});

await ensure("pages", { key: "engagement" }, {
  key: "engagement",
  title: l("Engagement social", "Social commitment"),
  subtitle: l(
    "Mettre les compétences et la donnée au service des communautés.",
    "Putting skills and data at the service of communities.",
  ),
  body: l(
    "La donnée prend tout son sens quand elle aide une communauté à choisir, apprendre et agir. Je réserve une place à l’accompagnement, au partage et aux initiatives ancrées dans les réalités haïtiennes.",
    "Data matters most when it helps a community choose, learn and act. I make space for accompaniment, sharing and initiatives rooted in Haitian realities.",
  ),
  heroImage: "",
  items: [
    { title: l("Développement d’Haïti", "Haiti’s development"), detail: l(""), image: "", url: "" },
    { title: l("Éducation & mentorat", "Education & mentoring"), detail: l(""), image: "", url: "" },
    { title: l("Donnée accessible", "Accessible data"), detail: l(""), image: "", url: "" },
    { title: l("Initiatives communautaires", "Community initiatives"), detail: l(""), image: "", url: "" },
  ],
  sections: [],
  timeline: [],
  entries: [],
  certifications: [],
  media: [],
});

await ensure("pages", { key: "cv" }, {
  key: "cv",
  title: l("Curriculum vitæ", "Résumé"),
  subtitle: l(
    "Un aperçu structuré de la formation, des expériences et des compétences.",
    "A structured overview of education, experience and skills.",
  ),
  body: l(
    "Ingénieur-agronome spécialisé en économie, titulaire d’un MBA en analytique d’affaires. Analyse de données, business intelligence, gestion de projet et suivi-évaluation.",
    "Agricultural engineer specialised in economics, holding an MBA in business analytics. Data analysis, business intelligence, project management and monitoring and evaluation.",
  ),
  heroImage: "",
  // Expériences, certifications et projets restent à saisir : rien n'est
  // inventé ici.
  entries: [],
  timeline: [
    { period: "", title: l("Ingénieur-agronome", "Agricultural engineer"), detail: l("Spécialisation en économie", "Specialisation in economics"), image: "" },
    { period: "", title: l("MBA — analytique d’affaires", "MBA — business analytics"), detail: l(""), image: "" },
  ],
  certifications: [],
  items: [],
  sections: [],
  media: [],
  documentUrl: "",
});

/* ------------------------------------------------------------------ */
/* Bibliothèque de médias                                              */
/* ------------------------------------------------------------------ */

/**
 * Visuels éditoriaux déjà présents dans le dépôt (`public/images/editorial`)
 * et hébergés sur Drive. Ils sont enregistrés comme médias externes pour être
 * sélectionnables depuis le CMS.
 *
 * La liste double celle de `lib/media/assets.ts` : ce script est en JavaScript
 * simple et ne peut pas importer un module TypeScript.
 */
const driveAssets = [
  ["1ulD3VmDYty7frnenoRJGkYqsOg7KKndt", "24-hero-executive.webp", "Jacques-Daguerre dans un environnement analytique bleu nuit"],
  ["1BCp_gPNgB9kGsm3x8yIRGwR7iKUVoevy", "02-hero-background-data.webp", "Visualisation de données"],
  ["1KD8F9joXnlbwiYUXi2GEsDneQYWgzovM", "03-data-to-decisions.webp", "Équipe analysant des données pour guider une décision"],
  ["1tQIB-nXXaTT3mQq-fUgCFQBrMyAzJ-SK", "04-multidisciplinary-journey.webp", "Parcours multidisciplinaire"],
  ["1TZf5hRzotCcYR5iEkTIFd9sCM84oDpDG", "25-haiti-quebec-personal.webp", "Parcours professionnel entre Haïti et le Québec"],
  ["1zFzEpzIDfbpdgjXxgAe14sd7GQZELy4n", "06-research.webp", "Recherche et méthodes analytiques"],
  ["1O6JTKFaZankIZs3oXRnqx5WRQrNBKCt2", "10-datakle-hero.webp", "Atelier stratégique Datakle"],
  ["1F9ejkzI7oTuZzkbeagM4DVWoRuw2TlhN", "14-haiti-data.webp", "Données au service d’Haïti"],
  ["1_95ckaW4bu_UXbexe-1pRMMd9s3fVaQF", "15-engagement-education.webp", "Atelier de formation et de partage"],
  ["1de_UDFF3w9hl-8xm_Sa4ztFZfb3TghCu", "23-open-graph-global.webp", "Daguerre — données et décision"],
  ["1qOGSsIvQxXAVnunMmRIRTFYQJRiG388d", "26-mba-achievement.webp", "Parcours MBA en analytique d’affaires"],
  ["1wwlS9DvGR8tSX_kFvB7gdZF1mt8vdi3u", "27-professional-analyst.webp", "Jacques-Daguerre, analyste professionnel"],
  ["1yU5Su_1JDQrm_ubebpeny6j0Yq2BM7tc", "28-datakle-founder.webp", "Fondateur de Datakle"],
  ["1hKT19ha1AdlvXlEzkZ_G0dFohXMQep56", "29-agronomy-foundation.webp", "Fondations en agronomie"],
  ["1pfO-otl64o3bhFozB2_8mFeKYzFWdBYN", "30-economics-specialization.webp", "Spécialisation en économie"],
  ["10N53WvQgO9HbzT0QmGGgEBtRxKF39tSc", "31-monitoring-evaluation.webp", "Suivi et évaluation"],
  ["1y-AL9is7_-iB6aRl3r2YtkP6ofzX3T54", "32-rigorous-research.webp", "Recherche rigoureuse"],
  ["1sZZerq1trXEt6CiVKc_VMPLPs1lwmB5u", "33-decision-support-realtime.webp", "Aide à la décision en temps réel"],
  ["1ZBNQMUfKmX6OZzCCJ-pFm-nA4_cIm6AT", "34-analytical-strategy.webp", "Stratégie analytique"],
  ["18fcTlbvyBqLhlzqm7RAW7mUVsYksvNLT", "35-efficiency-optimization.webp", "Efficience et optimisation"],
  ["1yIfSHC26SgW_5fVKiZLATb3y1C_B_QY6", "36-powerbi-project.webp", "Projet de tableau de bord Power BI"],
  ["1CjBs0zo17c0sufBW8kxg-PKlKpFBp65U", "37-access-excel-automation.webp", "Automatisation Access et Excel"],
  ["1NwjpVBq83O8UOThbJp2IMpaHeH7AO0Qj", "38-haiti-data-impact.webp", "Impact des données en Haïti"],
];

for (const [driveId, filename, alt] of driveAssets) {
  await ensure("media", { providerId: driveId }, {
    name: filename.replace(/^\d+-/, "").replace(/\.webp$/, "").replace(/-/g, " "),
    filename,
    provider: "google-drive",
    providerId: driveId,
    externalUrl: `https://drive.google.com/uc?export=view&id=${driveId}`,
    mimeType: "image/webp",
    width: 0,
    height: 0,
    alt: l(alt),
    category: "éditorial",
  });
}

await client.close();
console.log(
  created > 0
    ? `Contenu initial : ${created} document(s) créé(s). Les données existantes n’ont pas été touchées.`
    : "Rien à créer : le contenu initial est déjà en place.",
);
