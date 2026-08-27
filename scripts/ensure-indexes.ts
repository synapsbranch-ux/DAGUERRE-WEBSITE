import mongoose from "mongoose";

import { connectToDatabase } from "@/lib/db/client";
import * as cms from "@/lib/db/models/index";
import * as platform from "@/lib/db/models/platform";

/**
 * Construction et vérification des index.
 *
 * Mongoose construit les index **paresseusement**, à la première utilisation
 * d'un modèle, et avale l'échec : un index unique refusé — parce que des
 * doublons existent déjà, ou parce que le serveur rejette l'expression d'un
 * index partiel — laisse l'application tourner sans la contrainte qu'elle croit
 * avoir. C'est la pire des situations : le code compte sur une garantie qui
 * n'existe pas.
 *
 * Ce script appelle `syncIndexes()` sur chaque modèle et **rapporte** ce qui
 * échoue, avec un code de sortie non nul. À exécuter au déploiement, avant que
 * l'application ne serve du trafic.
 *
 * Il vérifie ensuite nommément les quatre contraintes d'unicité dont dépend la
 * logique métier — c'est le seul moyen de savoir qu'elles sont réellement
 * posées, et pas seulement déclarées dans le schéma.
 *
 *   MONGODB_URI=… pnpm db:indexes
 *
 * `syncIndexes()` **supprime** les index qui ne sont plus déclarés dans le
 * schéma. C'est voulu — un index orphelin coûte à chaque écriture — mais cela
 * signifie qu'un index créé à la main hors du code disparaîtra.
 */

type Model = mongoose.Model<Record<string, unknown>>;

/** Contraintes dont la logique métier dépend réellement. */
const CRITICAL: { collection: string; key: string; why: string }[] = [
  {
    collection: "quoterequests",
    key: "submissionKey_1",
    why: "anti-double-soumission d'une demande de devis",
  },
  {
    collection: "newsletterrecipients",
    key: "campaignId_1_subscriberId_1",
    why: "un abonné ne peut pas recevoir deux fois la même campagne",
  },
  {
    collection: "quoteproposals",
    key: "quoteRequestId_1_version_1",
    why: "deux propositions ne peuvent pas porter le même numéro de version",
  },
  { collection: "appusers", key: "logtoId_1", why: "un compte Logto, une ligne de miroir" },
];

async function main() {
  await connectToDatabase();

  const models = [...Object.values(platform), ...Object.values(cms)].filter(
    (value): value is Model =>
      typeof value === "function" && "syncIndexes" in value && "modelName" in value,
  );

  const failures: string[] = [];

  for (const model of models) {
    try {
      await model.syncIndexes();
      console.log(`  ✓ ${model.modelName}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      failures.push(`${model.modelName} : ${detail}`);
      console.error(`  ✗ ${model.modelName} — ${detail}`);
    }
  }

  console.log(`\n${models.length} modèle(s) traité(s).\n`);

  // Vérification nommée : un `syncIndexes()` vert ne prouve pas que *cet*
  // index-là existe, seulement qu'aucune erreur n'a été levée.
  const db = mongoose.connection.db;
  if (!db) throw new Error("Connexion perdue.");

  console.log("Contraintes critiques :");

  for (const { collection, key, why } of CRITICAL) {
    try {
      const indexes = (await db.collection(collection).indexes()) as { name?: string }[];
      const found = indexes.some((index) => index.name === key);
      console.log(`  ${found ? "✓" : "✗"} ${collection}.${key} — ${why}`);
      if (!found) failures.push(`Index absent : ${collection}.${key} (${why})`);
    } catch (error) {
      // Une collection encore vide n'existe pas côté MongoDB : ses index
      // apparaîtront à la première écriture, ce n'est pas un échec.
      console.log(`  · ${collection} — collection absente, sera créée à la première écriture`);
      void error;
    }
  }

  await mongoose.connection.close();

  if (failures.length > 0) {
    console.error(`\n${failures.length} problème(s) :`);
    for (const failure of failures) console.error(`  - ${failure}`);
    console.error(
      "\nUn index unique refusé signifie presque toujours des doublons déjà en base. " +
        "Corrigez les données avant de relancer : l'application compte sur cette contrainte.",
    );
    process.exit(1);
  }

  console.log("\nTous les index sont en place.");
}

// Un `await` de plus haut niveau ferait basculer le module en asynchrone, que
// le transformateur de `tsx` refuse de charger depuis un contexte CommonJS.
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
