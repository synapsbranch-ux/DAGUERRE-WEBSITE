import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { fileAccessDecision, type FileDoc } from "@/lib/platform/file-access";
import { safeNextPath } from "@/lib/platform/pathname";
import { resourceAccessFilter } from "@/lib/platform/queries";
import { audienceFilter } from "@/lib/platform/newsletter";
import { createToken, readToken, tokenPurpose } from "@/lib/platform/tokens";
import { escapeHtml, safeHref } from "@/lib/platform/sanitize";
import { markdownToEmailBlocks } from "@/lib/email/markdown";
import { renderEmail } from "@/lib/email/layout";
import { csvCell } from "@/lib/platform/csv";
import { readPage, searchRegex, subscriberFilter, quoteFilter } from "@/lib/platform/admin-filters";
import { checkFile, downloadHeaders, safeFilename } from "@/lib/media/files";
import { isAdminRole, normalizeRole } from "@/lib/platform/enums";
import { roleFromClaims } from "@/lib/auth/roles";
import { isHandledLogtoEvent, verifyLogtoSignature } from "@/lib/auth/webhook";
import { isHandledEvent, verifyWebhookSignature } from "@/lib/email/webhook";
import { createHmac } from "node:crypto";

/**
 * Contrôles de sécurité.
 *
 * Ces tests portent sur les fonctions **pures** qui décident d'un accès, d'un
 * échappement ou d'une redirection. Ce sont celles où une régression ne se
 * voit pas à l'écran : un fichier servi à qui ne devrait pas le voir, une
 * balise interprétée, une redirection ouverte.
 */

const SECRET = "secret-de-test-suffisamment-long-pour-hmac";
process.env.APP_TOKEN_SECRET = SECRET;

// Les identifiants sont des sujets Logto : chaînes courtes, ni ObjectId ni UUID.
const client = { id: "usr7h2k9qp4m", role: "customer" };
const other = { id: "usr3b8n1vx6z", role: "customer" };
const admin = { id: "usr5d4c2wy8t", role: "admin" };

const NO_OWNERSHIP = { ownsQuote: false, ownsProject: false, ownsConversation: false };

describe("accès aux fichiers privés", () => {
  const publicFile: FileDoc = { visibility: "public" };
  const accountFile: FileDoc = { visibility: "client_account" };
  const clientFile: FileDoc = { visibility: "specific_client", ownerUserId: client.id };
  const projectFile: FileDoc = { visibility: "specific_project", projectId: "p1" };
  const adminFile: FileDoc = { visibility: "admin_only" };

  test("un fichier public est servi sans compte", () => {
    assert.deepEqual(fileAccessDecision(publicFile, null), { allowed: true });
  });

  test("un fichier réservé aux comptes demande une authentification", () => {
    assert.deepEqual(fileAccessDecision(accountFile, null), {
      allowed: false,
      reason: "unauthenticated",
    });
  });

  test("le propriétaire accède à son document", () => {
    assert.deepEqual(fileAccessDecision(clientFile, client), { allowed: true });
  });

  test("un autre client n'accède pas au document d'un tiers", () => {
    assert.deepEqual(fileAccessDecision(clientFile, other, NO_OWNERSHIP), {
      allowed: false,
      reason: "forbidden",
    });
  });

  test("un document de dossier suit la propriété du dossier", () => {
    const file: FileDoc = { visibility: "specific_client", quoteRequestId: "q1" };
    assert.deepEqual(
      fileAccessDecision(file, client, { ...NO_OWNERSHIP, ownsQuote: true }),
      { allowed: true },
    );
    assert.deepEqual(fileAccessDecision(file, other, NO_OWNERSHIP), {
      allowed: false,
      reason: "forbidden",
    });
  });

  test("un document de projet exige la propriété du projet", () => {
    assert.deepEqual(
      fileAccessDecision(projectFile, client, { ...NO_OWNERSHIP, ownsProject: true }),
      { allowed: true },
    );
    assert.deepEqual(fileAccessDecision(projectFile, client, NO_OWNERSHIP), {
      allowed: false,
      reason: "forbidden",
    });
  });

  test("un document d'administration reste fermé aux clients", () => {
    assert.deepEqual(fileAccessDecision(adminFile, client, NO_OWNERSHIP), {
      allowed: false,
      reason: "forbidden",
    });
    assert.deepEqual(fileAccessDecision(adminFile, admin), { allowed: true });
  });

  test("une portée inconnue est refusée plutôt qu'ouverte", () => {
    assert.deepEqual(fileAccessDecision({ visibility: "n-importe-quoi" }, client, NO_OWNERSHIP), {
      allowed: false,
      reason: "forbidden",
    });
    assert.deepEqual(fileAccessDecision({}, client, NO_OWNERSHIP), {
      allowed: false,
      reason: "forbidden",
    });
  });
});

describe("visibilité des ressources", () => {
  test("un visiteur anonyme ne voit que le public", () => {
    assert.deepEqual(resourceAccessFilter(null), { visibility: "public" });
  });

  test("un compte connecté ajoute les ressources authentifiées et celles qui le nomment", () => {
    const filter = resourceAccessFilter(client.id) as { $or: Record<string, unknown>[] };
    assert.equal(filter.$or.length, 2);
    assert.deepEqual(filter.$or[0], { visibility: { $in: ["public", "authenticated"] } });
    assert.deepEqual(filter.$or[1], { visibility: "private", allowedUserIds: client.id });
  });
});

describe("jetons signés", () => {
  test("un jeton valide restitue son sujet", () => {
    const token = createToken(tokenPurpose.newsletterUnsubscribe, "abonne-1");
    assert.equal(readToken(tokenPurpose.newsletterUnsubscribe, token), "abonne-1");
  });

  test("un jeton ne vaut que pour son usage", () => {
    const token = createToken(tokenPurpose.newsletterUnsubscribe, "abonne-1");
    assert.equal(readToken(tokenPurpose.newsletterConfirm, token), null);
    assert.equal(readToken(tokenPurpose.quoteClaim, token), null);
  });

  test("une signature falsifiée est rejetée", () => {
    const token = createToken(tokenPurpose.quoteClaim, "devis-1");
    const [body] = token.split(".");
    assert.equal(readToken(tokenPurpose.quoteClaim, `${body}.signature-inventee`), null);
  });

  test("modifier la charge utile invalide le jeton", () => {
    const token = createToken(tokenPurpose.quoteClaim, "devis-1");
    const [, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ p: tokenPurpose.quoteClaim, s: "devis-2", e: 0 }))
      .toString("base64url");
    assert.equal(readToken(tokenPurpose.quoteClaim, `${forged}.${signature}`), null);
  });

  test("un jeton expiré est refusé", () => {
    const token = createToken(tokenPurpose.newsletterConfirm, "abonne-1", -10);
    assert.equal(readToken(tokenPurpose.newsletterConfirm, token), null);
  });

  test("une entrée vide ou malformée ne lève pas", () => {
    assert.equal(readToken(tokenPurpose.quoteClaim, null), null);
    assert.equal(readToken(tokenPurpose.quoteClaim, ""), null);
    assert.equal(readToken(tokenPurpose.quoteClaim, "sans-point"), null);
    assert.equal(readToken(tokenPurpose.quoteClaim, ".sig"), null);
  });

  test("un jeton signé avec un autre secret est rejeté", () => {
    const token = createToken(tokenPurpose.quoteClaim, "devis-1");
    process.env.APP_TOKEN_SECRET = "un-autre-secret-tout-aussi-long-mais-different";
    assert.equal(readToken(tokenPurpose.quoteClaim, token), null);
    process.env.APP_TOKEN_SECRET = SECRET;
  });
});

describe("chemin de retour après connexion", () => {
  test("un chemin interne est conservé", () => {
    assert.equal(safeNextPath("/fr/espace-client/devis", "/"), "/fr/espace-client/devis");
  });

  test("les redirections ouvertes sont écartées", () => {
    for (const hostile of [
      "//exemple.com",
      "https://exemple.com",
      "http://exemple.com",
      "/\\exemple.com",
      "javascript:alert(1)",
      "/ /exemple.com",
      "",
      null,
      42,
    ]) {
      assert.equal(safeNextPath(hostile, "/repli"), "/repli", `accepté à tort : ${String(hostile)}`);
    }
  });
});

describe("échappement du contenu rédigé", () => {
  test("les caractères de balisage sont neutralisés", () => {
    assert.equal(
      escapeHtml('<script>alert("x")</script>'),
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });

  test("seuls http, https, mailto et les chemins internes sont acceptés en lien", () => {
    assert.equal(safeHref("https://exemple.com/a?b=1"), "https://exemple.com/a?b=1");
    assert.equal(safeHref("mailto:a@b.co"), "mailto:a@b.co");
    assert.equal(safeHref("/fr/blog"), "/fr/blog");
    assert.equal(safeHref("javascript:alert(1)"), null);
    assert.equal(safeHref("data:text/html;base64,PHNjcmlwdD4="), null);
    assert.equal(safeHref("//exemple.com"), null);
  });

  test("un corps d'infolettre hostile devient du texte, pas du balisage", () => {
    const blocks = markdownToEmailBlocks('<img src=x onerror="alert(1)"> **gras**');
    const html = blocks.map((block) => (block.kind === "raw" ? block.html : "")).join("");
    assert.ok(!html.includes("<img"), "une balise brute a survécu");
    assert.ok(html.includes("&lt;img"), "la balise n'a pas été échappée");
    assert.ok(html.includes("<strong>gras</strong>"), "le gras Markdown n'est pas rendu");
  });

  test("un lien Markdown vers javascript: n'est pas transformé en lien", () => {
    const blocks = markdownToEmailBlocks("[cliquez](javascript:alert(1))");
    const html = blocks.map((block) => (block.kind === "raw" ? block.html : "")).join("");
    assert.ok(!html.includes("<a "), "un lien a été produit pour un schéma interdit");
  });

  test("le gabarit de courriel échappe les textes qu'on lui confie", () => {
    const { html, text } = renderEmail({
      locale: "fr",
      title: "<b>Titre</b>",
      blocks: [{ kind: "paragraph", text: "<script>x</script>" }],
    });
    assert.ok(html.includes("&lt;b&gt;Titre&lt;/b&gt;"));
    assert.ok(!html.includes("<script>"));
    assert.ok(text.includes("<script>x</script>"), "la version texte reste littérale");
  });

  test("un appel à l'action vers un schéma interdit n'est pas rendu", () => {
    const { html } = renderEmail({
      locale: "fr",
      title: "Test",
      blocks: [{ kind: "cta", label: "Cliquer", href: "javascript:alert(1)" }],
    });
    assert.ok(!html.includes("javascript:"));
  });
});

describe("export CSV", () => {
  test("les formules de tableur sont neutralisées", () => {
    assert.equal(csvCell("=HYPERLINK(\"http://x\")"), "\"'=HYPERLINK(\"\"http://x\"\")\"");
    assert.equal(csvCell("+1"), "\"'+1\"");
    assert.equal(csvCell("-1"), "\"'-1\"");
    assert.equal(csvCell("@x"), "\"'@x\"");
  });

  test("les guillemets sont doublés et le texte ordinaire préservé", () => {
    assert.equal(csvCell('a"b'), '"a""b"');
    assert.equal(csvCell("nom@exemple.com"), '"nom@exemple.com"');
    assert.equal(csvCell(null), '""');
  });
});

describe("filtres de liste", () => {
  test("un terme de recherche est échappé avant de devenir une expression régulière", () => {
    assert.equal(searchRegex(".*").$regex, "\\.\\*");
    assert.equal(searchRegex("a+b").$regex, "a\\+b");
  });

  test("une valeur d'énumération inconnue est ignorée", () => {
    const params = new URLSearchParams({ status: "n-importe-quoi", source: "homepage" });
    const filter = subscriberFilter(params) as { $and: Record<string, unknown>[] };
    assert.equal(filter.$and.length, 1);
    assert.deepEqual(filter.$and[0], { source: "homepage" });
  });

  test("un identifiant mal formé n'entre pas dans la requête", () => {
    const filter = quoteFilter(new URLSearchParams({ service: "pas-un-id" }));
    assert.deepEqual(filter, {});
  });

  test("la pagination est bornée", () => {
    assert.equal(readPage(new URLSearchParams({ page: "-5" })), 1);
    assert.equal(readPage(new URLSearchParams({ page: "abc" })), 1);
    assert.equal(readPage(new URLSearchParams({ page: "999999999" })), 10_000);
    assert.equal(readPage(new URLSearchParams({ page: "3" })), 3);
  });
});

describe("audiences d'infolettre", () => {
  test("aucun segment n'atteint un abonné non éligible", () => {
    for (const audience of ["all_active", "locale_fr", "locale_en", "clients", "non_clients"] as const) {
      const filter = audienceFilter(audience) as { status?: { $in: string[] } };
      assert.deepEqual(filter.status, { $in: ["active"] }, `segment ${audience} sans garde de statut`);
    }
  });
});

describe("téléversement de fichiers", () => {
  const asFile = (name: string, type: string) => ({ name, type }) as File;

  test("un type non listé est refusé", () => {
    const bytes = Buffer.from("MZ");
    const result = checkFile(asFile("virus.exe", "application/x-msdownload"), bytes);
    assert.equal(result.ok, false);
  });

  test("un PDF annoncé mais dont le contenu ne correspond pas est refusé", () => {
    const result = checkFile(asFile("faux.pdf", "application/pdf"), Buffer.from("<html>"));
    assert.equal(result.ok, false);
  });

  test("un vrai PDF passe", () => {
    const result = checkFile(asFile("vrai.pdf", "application/pdf"), Buffer.from("%PDF-1.7\n..."));
    assert.equal(result.ok, true);
  });

  test("un fichier vide ou trop gros est refusé", () => {
    assert.equal(checkFile(asFile("v.pdf", "application/pdf"), Buffer.alloc(0)).ok, false);
    assert.equal(
      checkFile(asFile("v.pdf", "application/pdf"), Buffer.from("%PDF-1.7"), 4).ok,
      false,
    );
  });

  test("le nom de fichier est assaini", () => {
    for (const hostile of ["../../etc/passwd", "a/b/c.pdf", "..\\windows\\system32", 'a"b.pdf']) {
      const safe = safeFilename(hostile, "pdf");
      assert.ok(!safe.includes("/"), `séparateur conservé dans ${safe}`);
      assert.ok(!safe.includes("\\"), `séparateur conservé dans ${safe}`);
      assert.ok(!safe.includes(".."), `remontée de chemin conservée dans ${safe}`);
      assert.ok(!safe.includes('"'), `guillemet conservé dans ${safe}`);
      assert.ok(safe.endsWith(".pdf"), `extension imposée absente de ${safe}`);
    }

    assert.equal(safeFilename("Résumé été.pdf", "pdf"), "Resume-ete.pdf");
    assert.equal(safeFilename("", "pdf"), "document.pdf");
  });

  test("l'en-tête de téléchargement force l'enregistrement et neutralise les guillemets", () => {
    const headers = downloadHeaders('a"b.pdf', "application/pdf", 10) as Record<string, string>;
    assert.ok(headers["content-disposition"].startsWith("attachment;"));
    assert.ok(!headers["content-disposition"].includes('"ab.pdf"') === false);
    assert.equal(headers["cache-control"], "private, no-store");
    assert.equal(headers["x-content-type-options"], "nosniff");
  });
});

describe("rôles", () => {
  test("un rôle inconnu retombe sur client, jamais sur administrateur", () => {
    assert.equal(normalizeRole("n-importe-quoi"), "customer");
    assert.equal(normalizeRole(undefined), "customer");
    // Ancien vocabulaire : les rôles retirés ne doivent rien ouvrir.
    assert.equal(normalizeRole("client"), "customer");
    assert.equal(normalizeRole("staff"), "customer");
    assert.equal(normalizeRole("editor"), "customer");
    assert.equal(isAdminRole("user"), false);
    assert.equal(isAdminRole(null), false);
  });

  test("seul `admin` est administrateur", () => {
    assert.equal(isAdminRole("admin"), true);
    assert.equal(isAdminRole("customer"), false);
    assert.equal(isAdminRole("staff"), false);
    assert.equal(isAdminRole("ADMIN"), false);
  });
});

describe("rôle issu de la revendication Logto", () => {
  test("seule la présence du rôle nommé ouvre le tableau de bord", () => {
    assert.equal(roleFromClaims({ roles: ["admin"] }), "admin");
    assert.equal(roleFromClaims({ roles: ["customer", "admin"] }), "admin");
    assert.equal(roleFromClaims({ roles: ["customer"] }), "customer");
  });

  test("une revendication absente ou mal formée dégrade les droits", () => {
    assert.equal(roleFromClaims(undefined), "customer");
    assert.equal(roleFromClaims(null), "customer");
    assert.equal(roleFromClaims({}), "customer");
    assert.equal(roleFromClaims({ roles: [] }), "customer");
    // Portée `roles` oubliée dans la configuration : la revendication manque.
    assert.equal(roleFromClaims({ roles: "admin" }), "customer");
    assert.equal(roleFromClaims({ roles: { admin: true } }), "customer");
    // Un rôle inconnu n'ouvre rien.
    assert.equal(roleFromClaims({ roles: ["superadmin"] }), "customer");
  });
});

describe("signature des notifications Logto", () => {
  const KEY = "cle-de-signature-de-webhook";
  const BODY = JSON.stringify({ event: "User.Created", data: { id: "usr7h2k9qp4m" } });
  const signature = createHmac("sha256", KEY).update(BODY).digest("hex");

  test("une signature valide est acceptée", () => {
    assert.equal(verifyLogtoSignature({ secret: KEY, signature, body: BODY }).ok, true);
  });

  test("un corps altéré est rejeté", () => {
    const tampered = JSON.stringify({ event: "User.Created", data: { id: "usr-de-lattaquant" } });
    assert.equal(verifyLogtoSignature({ secret: KEY, signature, body: tampered }).ok, false);
  });

  test("une autre clé est rejetée", () => {
    assert.equal(verifyLogtoSignature({ secret: "autre-cle", signature, body: BODY }).ok, false);
  });

  test("sans en-tête ou sans clé configurée, rien ne passe", () => {
    assert.equal(verifyLogtoSignature({ secret: KEY, signature: null, body: BODY }).ok, false);
    assert.equal(verifyLogtoSignature({ secret: undefined, signature, body: BODY }).ok, false);
  });

  test("seuls les événements de compte sont traités", () => {
    assert.equal(isHandledLogtoEvent("User.Created"), true);
    assert.equal(isHandledLogtoEvent("User.Data.Updated"), true);
    assert.equal(isHandledLogtoEvent("User.Deleted"), true);
    assert.equal(isHandledLogtoEvent("PostSignIn"), false);
    assert.equal(isHandledLogtoEvent(undefined), false);
  });
});


describe("notifications du fournisseur d'envoi", () => {
  const secret = "whsec_" + Buffer.from("secret-webhook-de-test").toString("base64");
  const id = "msg_1";
  const body = JSON.stringify({ type: "email.bounced", data: { email_id: "abc" } });
  const now = 1_800_000_000_000;
  const timestamp = String(Math.floor(now / 1000));

  const sign = (payload: string, at: string, messageId = id, key = secret) =>
    "v1," +
    createHmac("sha256", Buffer.from(key.slice(6), "base64"))
      .update(`${messageId}.${at}.${payload}`)
      .digest("base64");

  test("une signature correcte est acceptée", () => {
    const result = verifyWebhookSignature({
      secret,
      id,
      timestamp,
      signatureHeader: sign(body, timestamp),
      body,
      now,
    });
    assert.deepEqual(result, { ok: true });
  });

  test("un corps modifié invalide la signature", () => {
    const result = verifyWebhookSignature({
      secret,
      id,
      timestamp,
      signatureHeader: sign(body, timestamp),
      body: body.replace("bounced", "delivered"),
      now,
    });
    assert.equal(result.ok, false);
  });

  test("un horodatage trop ancien est rejeté", () => {
    const old = String(Math.floor(now / 1000) - 3600);
    const result = verifyWebhookSignature({
      secret,
      id,
      timestamp: old,
      signatureHeader: sign(body, old),
      body,
      now,
    });
    assert.equal(result.ok, false);
  });

  test("sans secret configuré, rien n'est accepté", () => {
    const result = verifyWebhookSignature({
      secret: undefined,
      id,
      timestamp,
      signatureHeader: sign(body, timestamp),
      body,
      now,
    });
    assert.equal(result.ok, false);
  });

  test("des en-têtes absents sont rejetés", () => {
    assert.equal(
      verifyWebhookSignature({ secret, id: null, timestamp, signatureHeader: "x", body, now }).ok,
      false,
    );
    assert.equal(
      verifyWebhookSignature({ secret, id, timestamp: null, signatureHeader: "x", body, now }).ok,
      false,
    );
    assert.equal(
      verifyWebhookSignature({ secret, id, timestamp, signatureHeader: null, body, now }).ok,
      false,
    );
  });

  test("seuls les événements connus sont traités", () => {
    assert.equal(isHandledEvent("email.bounced"), true);
    assert.equal(isHandledEvent("email.opened"), false);
    assert.equal(isHandledEvent(42), false);
  });
});
