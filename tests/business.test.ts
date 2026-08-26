import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  actionableQuoteStatuses,
  campaignAudienceLabels,
  campaignAudiences,
  canTransitionQuote,
  clientProjectStatusLabels,
  clientProjectStatuses,
  internalQuoteActivityTypes,
  labelOf,
  proposalStatusLabels,
  proposalStatuses,
  quoteActivityLabels,
  quoteActivityTypes,
  quotePriorities,
  quotePriorityLabels,
  quoteStatusLabels,
  quoteStatuses,
  quoteTransitions,
  resourceTypeLabels,
  resourceTypes,
  resourceVisibilities,
  resourceVisibilityLabels,
  subscriberSourceLabels,
  subscriberSources,
  subscriberStatusLabels,
  subscriberStatuses,
} from "@/lib/platform/enums";
import { computeTotals, formatMoney, minorToInput, parseAmountToMinor } from "@/lib/platform/money";
import { buildProposal } from "@/lib/platform/proposals";
import { submissionKeyFrom } from "@/lib/platform/idempotency";
import { markdownToEmailBlocks, markdownToPlainText } from "@/lib/email/markdown";
import { campaignContentOf, renderCampaign } from "@/lib/platform/newsletter";
import { excerptOf, textToParagraphs } from "@/lib/platform/sanitize";
import { formatBytes, formatDate } from "@/lib/platform/format";
import { projectNumberPattern, quoteNumberPattern } from "@/lib/platform/numbers";
import { locales } from "@/lib/i18n";
import { href, publicPathname, routeKeys, routes, toInternalPath, toPublicPath } from "@/lib/routes";

process.env.BETTER_AUTH_SECRET = "secret-de-test-suffisamment-long-pour-hmac";

describe("machine à états des devis", () => {
  test("les transitions du parcours nominal sont autorisées", () => {
    const path = [
      ["submitted", "under_review"],
      ["under_review", "needs_information"],
      ["needs_information", "estimate_prepared"],
      ["estimate_prepared", "quote_sent"],
      ["quote_sent", "client_review"],
      ["client_review", "accepted"],
      ["accepted", "converted_to_project"],
    ] as const;

    for (const [from, to] of path) {
      assert.ok(canTransitionQuote(from, to), `${from} → ${to} refusée à tort`);
    }
  });

  test("les sauts d'étape sont refusés", () => {
    assert.equal(canTransitionQuote("submitted", "accepted"), false);
    assert.equal(canTransitionQuote("submitted", "converted_to_project"), false);
    assert.equal(canTransitionQuote("under_review", "quote_sent"), false);
    assert.equal(canTransitionQuote("needs_information", "accepted"), false);
  });

  test("un état terminal ne se rouvre pas", () => {
    for (const terminal of ["declined", "expired", "cancelled", "converted_to_project"] as const) {
      assert.deepEqual(quoteTransitions[terminal], [], `${terminal} a une sortie`);
      for (const target of quoteStatuses) {
        assert.equal(
          canTransitionQuote(terminal, target),
          false,
          `${terminal} → ${target} autorisée à tort`,
        );
      }
    }
  });

  test("une valeur inconnue n'ouvre aucune transition", () => {
    assert.equal(canTransitionQuote("n-importe-quoi", "accepted"), false);
    assert.equal(canTransitionQuote("submitted", "n-importe-quoi"), false);
  });

  test("toute cible déclarée est un statut connu", () => {
    for (const [from, targets] of Object.entries(quoteTransitions)) {
      for (const target of targets) {
        assert.ok(
          (quoteStatuses as readonly string[]).includes(target),
          `${from} pointe vers un statut inconnu : ${target}`,
        );
      }
    }
  });

  test("les états réclamant une action sont bien des états ouverts", () => {
    for (const status of actionableQuoteStatuses) {
      assert.ok(quoteTransitions[status].length > 0, `${status} est actionnable mais terminal`);
    }
  });

  test("les activités internes ne sont pas exposables", () => {
    assert.ok(internalQuoteActivityTypes.includes("admin_note_added"));
    for (const type of internalQuoteActivityTypes) {
      assert.ok((quoteActivityTypes as readonly string[]).includes(type));
    }
  });
});

describe("libellés bilingues", () => {
  const tables = [
    ["statuts de devis", quoteStatuses, quoteStatusLabels],
    ["priorités", quotePriorities, quotePriorityLabels],
    ["activités", quoteActivityTypes, quoteActivityLabels],
    ["propositions", proposalStatuses, proposalStatusLabels],
    ["projets", clientProjectStatuses, clientProjectStatusLabels],
    ["abonnés", subscriberStatuses, subscriberStatusLabels],
    ["sources", subscriberSources, subscriberSourceLabels],
    ["audiences", campaignAudiences, campaignAudienceLabels],
    ["types de ressource", resourceTypes, resourceTypeLabels],
    ["portées", resourceVisibilities, resourceVisibilityLabels],
  ] as const;

  test("chaque valeur a un libellé dans chaque langue", () => {
    for (const [name, values, labels] of tables) {
      for (const value of values) {
        for (const locale of locales) {
          const label = (labels as Record<string, Record<string, string>>)[value]?.[locale];
          assert.ok(label && label.length > 0, `${name} : ${value} sans libellé ${locale}`);
        }
      }
    }
  });

  test("une valeur inconnue retombe sur sa clé plutôt que sur du vide", () => {
    assert.equal(labelOf(quoteStatusLabels, "inconnu", "fr"), "inconnu");
  });
});

describe("montants", () => {
  test("la saisie est convertie en unités mineures", () => {
    assert.equal(parseAmountToMinor("19.99"), 1999);
    assert.equal(parseAmountToMinor("19,99"), 1999);
    assert.equal(parseAmountToMinor("1 250,50"), 125_050);
    assert.equal(parseAmountToMinor("0"), 0);
    assert.equal(parseAmountToMinor(""), 0);
    assert.equal(parseAmountToMinor(12.5), 1250);
  });

  test("une saisie invalide est refusée plutôt qu'arrondie au hasard", () => {
    assert.equal(parseAmountToMinor("abc"), null);
    assert.equal(parseAmountToMinor("-5"), null);
    assert.equal(parseAmountToMinor("1.999"), null);
    assert.equal(parseAmountToMinor(Number.NaN), null);
    assert.equal(parseAmountToMinor(null), null);
  });

  test("l'aller-retour saisie → mineur → saisie est stable", () => {
    for (const value of ["0.00", "19.99", "1250.50", "100000.00"]) {
      assert.equal(minorToInput(parseAmountToMinor(value)!), value);
    }
  });

  test("les totaux sont exacts là où les flottants dérivent", () => {
    const items = [
      { quantity: 3, unitPrice: parseAmountToMinor("0.10")! },
      { quantity: 7, unitPrice: parseAmountToMinor("0.10")! },
    ];
    const { amounts, subtotal, total } = computeTotals(items);
    assert.deepEqual(amounts, [30, 70]);
    assert.equal(subtotal, 100);
    assert.equal(total, 100);
  });

  test("remise et taxes s'appliquent dans cet ordre, sans total négatif", () => {
    const items = [{ quantity: 2, unitPrice: 10_000 }];
    const { subtotal, total } = computeTotals(items, 5_000, 3_000);
    assert.equal(subtotal, 20_000);
    assert.equal(total, 18_000);

    assert.equal(computeTotals(items, 999_999, 0).total, 0);
  });

  test("le format respecte la devise et la langue", () => {
    assert.ok(formatMoney(125_050, "CAD", "fr").includes("1"));
    assert.ok(formatMoney(125_050, "EUR", "en").includes("€"));
    // Une devise inconnue retombe sur le dollar canadien plutôt que d'échouer.
    assert.ok(formatMoney(100, "XXX", "fr").length > 0);
  });
});

describe("construction d'une proposition", () => {
  const base = {
    title: "Tableau de bord",
    summary: "",
    currency: "CAD" as const,
    items: [
      { name: "Audit", description: "", quantity: 1, unitPrice: "1500" },
      { name: "Développement", description: "", quantity: 10, unitPrice: "120,50" },
    ],
    discount: "0",
    tax: "0",
    validUntil: "",
    terms: "",
  };

  test("les montants de ligne et les totaux sont recalculés", () => {
    const built = buildProposal(base);
    assert.ok(built.ok);
    if (!built.ok) return;

    const value = built.value as {
      items: { amount: number }[];
      subtotal: number;
      total: number;
    };
    assert.deepEqual(
      value.items.map((item) => item.amount),
      [150_000, 120_500],
    );
    assert.equal(value.subtotal, 270_500);
    assert.equal(value.total, 270_500);
  });

  test("un total annoncé par le client est ignoré", () => {
    const built = buildProposal({ ...base, total: 1, subtotal: 1 });
    assert.ok(built.ok);
    if (!built.ok) return;
    assert.equal((built.value as { total: number }).total, 270_500);
  });

  test("une remise supérieure au sous-total est refusée", () => {
    const built = buildProposal({ ...base, discount: "999999" });
    assert.equal(built.ok, false);
  });

  test("un prix unitaire illisible est refusé", () => {
    const built = buildProposal({
      ...base,
      items: [{ name: "Audit", description: "", quantity: 1, unitPrice: "cent euros" }],
    });
    assert.equal(built.ok, false);
  });

  test("une proposition sans ligne est refusée", () => {
    assert.equal(buildProposal({ ...base, items: [] }).ok, false);
  });
});

describe("idempotence des soumissions", () => {
  test("le même identifiant produit la même empreinte", () => {
    const a = submissionKeyFrom("abcdefgh1234", ["x"]);
    const b = submissionKeyFrom("abcdefgh1234", ["y"]);
    assert.equal(a, b, "l'empreinte dépend du contenu alors qu'un identifiant est fourni");
  });

  test("deux identifiants distincts produisent des empreintes distinctes", () => {
    assert.notEqual(submissionKeyFrom("abcdefgh1234", []), submissionKeyFrom("abcdefgh9999", []));
  });

  test("sans identifiant, le contenu et la fenêtre de temps font foi", () => {
    const now = 1_800_000_000_000;
    const a = submissionKeyFrom("", ["a@b.co", "Projet"], now);
    const b = submissionKeyFrom("", ["a@b.co", "Projet"], now + 1000);
    const c = submissionKeyFrom("", ["a@b.co", "Autre projet"], now);
    const d = submissionKeyFrom("", ["a@b.co", "Projet"], now + 20 * 60 * 1000);

    assert.equal(a, b, "un renvoi immédiat devrait retomber sur la même empreinte");
    assert.notEqual(a, c, "un contenu différent devrait changer l'empreinte");
    assert.notEqual(a, d, "une demande bien plus tard devrait pouvoir passer");
  });

  test("un identifiant trop court ou hostile est ignoré", () => {
    const now = 1_800_000_000_000;
    const content = submissionKeyFrom("", ["x"], now);
    assert.equal(submissionKeyFrom("abc", ["x"], now), content);
    assert.equal(submissionKeyFrom("../../etc", ["x"], now), content);
  });
});

describe("rendu d'infolettre", () => {
  const campaign = campaignContentOf({
    subject: "Nouveautés",
    previewText: "Ce mois-ci",
    content: "# Titre\n\nUn paragraphe.\n\n- un\n- deux\n\n[[CTA:Lire|https://exemple.com/a]]",
    locale: "fr",
  });

  test("les constructions Markdown deviennent du HTML de courriel", () => {
    const { html } = renderCampaign(campaign, "https://exemple.com/desabonnement");
    assert.ok(html.includes("Titre"));
    assert.ok(html.includes("<li"));
    assert.ok(html.includes("https://exemple.com/a"));
  });

  test("le lien de désabonnement est présent dans les deux formats", () => {
    const { html, text } = renderCampaign(campaign, "https://exemple.com/desabonnement");
    assert.ok(html.includes("https://exemple.com/desabonnement"));
    assert.ok(text.includes("https://exemple.com/desabonnement"));
  });

  test("le texte de prévisualisation est masqué dans le corps", () => {
    const { html } = renderCampaign(campaign, "https://exemple.com/d");
    const index = html.indexOf("Ce mois-ci");
    assert.ok(index > 0);
    assert.ok(html.slice(0, index).includes("display:none"));
  });

  test("la version texte reste lisible", () => {
    const plain = markdownToPlainText(campaign.content);
    assert.ok(plain.includes("Titre"));
    assert.ok(plain.includes("Lire : https://exemple.com/a"));
    assert.ok(!plain.includes("[[CTA"));
  });

  test("un corps vide ne produit aucun bloc", () => {
    assert.deepEqual(markdownToEmailBlocks(""), []);
    assert.deepEqual(markdownToEmailBlocks("\n\n  \n"), []);
  });
});

describe("mise en forme", () => {
  test("les paragraphes de texte brut sont séparés et échappés", () => {
    const html = textToParagraphs("Bonjour <b>\n\nSuite");
    assert.equal(html.split("<p>").length - 1, 2);
    assert.ok(html.includes("&lt;b&gt;"));
  });

  test("un extrait est tronqué proprement", () => {
    assert.equal(excerptOf("court", 20), "court");
    assert.equal(excerptOf("a".repeat(30), 10).length, 10);
    assert.ok(excerptOf("a".repeat(30), 10).endsWith("…"));
  });

  test("les dates invalides ne cassent pas l'affichage", () => {
    assert.equal(formatDate("", "fr"), "—");
    assert.equal(formatDate(null, "en"), "—");
    assert.ok(formatDate("2026-04-20T12:00:00.000Z", "fr").length > 0);
  });

  test("les tailles de fichier sont lisibles dans les deux langues", () => {
    assert.equal(formatBytes(0, "fr"), "—");
    assert.ok(formatBytes(2048, "fr").endsWith("ko"));
    assert.ok(formatBytes(2048, "en").endsWith("kB"));
    assert.ok(formatBytes(5 * 1024 * 1024, "fr").endsWith("Mo"));
  });
});

describe("identifiants lisibles", () => {
  test("les formats attendus sont reconnus", () => {
    assert.ok(quoteNumberPattern.test("DQ-2026-000123"));
    assert.ok(projectNumberPattern.test("DP-2026-000001"));
    assert.equal(quoteNumberPattern.test("DQ-2026-123"), false);
    assert.equal(quoteNumberPattern.test("DP-2026-000123"), false);
  });
});


describe("table des routes", () => {
  test("chaque route est déclarée dans les deux langues", () => {
    for (const key of routeKeys) {
      for (const locale of locales) {
        assert.equal(typeof routes[key].path[locale], "string", `${key} sans chemin ${locale}`);
        assert.ok(routes[key].label[locale].length > 0, `${key} sans libellé ${locale}`);
      }
    }
  });

  test("les pages de compte et l'espace client restent hors du plan de site", () => {
    for (const key of [
      "login",
      "register",
      "forgotPassword",
      "resetPassword",
      "quoteClaim",
      "newsletter",
      "newsletterConfirm",
      "newsletterUnsubscribe",
      "portal",
      "portalArticles",
      "portalResources",
      "portalQuotes",
      "portalMessages",
      "portalProjects",
      "portalNotifications",
      "portalProfile",
    ] as const) {
      assert.equal(routes[key].inSitemap, false, `${key} figure dans le plan de site`);
    }
  });

  test("l'aller-retour public → interne → public est stable", () => {
    for (const key of routeKeys) {
      const publicPath = routes[key].path.en;
      if (!publicPath) continue;

      const internal = toInternalPath("en", publicPath) ?? publicPath;
      const back = toPublicPath("en", internal) ?? internal;
      assert.equal(back, publicPath, `${key} ne revient pas à sa forme publique`);
    }
  });

  test("un chemin interne est ramené à sa forme publique, un chemin public reste stable", () => {
    assert.equal(publicPathname("en", "/en/realisations"), "/en/portfolio");
    assert.equal(publicPathname("en", "/en/portfolio"), "/en/portfolio");
    assert.equal(publicPathname("en", "/en/espace-client/devis"), "/en/client/quotes");
    assert.equal(publicPathname("en", "/en/client/quotes"), "/en/client/quotes");
    // Le français est déjà la forme interne : rien ne change.
    assert.equal(publicPathname("fr", "/fr/realisations"), "/fr/realisations");
    assert.equal(publicPathname("fr", "/fr/espace-client"), "/fr/espace-client");
  });

  test("les sous-sections de l'espace client sont préfixées par leur racine", () => {
    for (const locale of locales) {
      const root = routes.portal.path[locale];
      for (const key of routeKeys.filter((entry) => entry.startsWith("portal") && entry !== "portal")) {
        assert.ok(
          routes[key].path[locale].startsWith(`${root}/`),
          `${key} sort de l'espace client en ${locale}`,
        );
      }
    }
  });

  test("href compose un chemin public avec segments", () => {
    assert.equal(href("portalQuotes", "en", "abc"), "/en/client/quotes/abc");
    assert.equal(href("portalQuotes", "fr", "abc"), "/fr/espace-client/devis/abc");
    assert.equal(href("home", "fr"), "/fr");
  });
});
