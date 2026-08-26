# Daguerre

Site bilingue (FR/EN), espace client et CMS privé, sur Next.js 16 (App Router),
TypeScript, Mongoose et Better Auth. Tout le contenu public vient de MongoDB :
il n'y a pas de contenu de démonstration dans le code.

Trois surfaces partagent une seule base, une seule authentification et un seul
tableau de bord :

- **le site public** — portfolio, Datakle, articles, bibliothèque de ressources,
  inscription à l'infolettre, demande de devis ;
- **l'espace client** (`/espace-client`, `/client` en anglais) — suivi des
  devis, propositions à accepter ou refuser, messagerie, projets, documents,
  notifications, profil ;
- **le tableau de bord** (`/admin`) — contenus, ressources, clients, devis,
  propositions, projets, conversations, abonnés, campagnes, activité.

## Prérequis

- Node 20 ou plus
- pnpm 11 ou plus
- Une instance MongoDB (locale ou hébergée)

## Installation

```bash
pnpm install
cp .env.example .env.local   # puis renseigner les variables
pnpm dev
```

Les variables sont documentées dans `.env.example`. Trois sont indispensables :

| Variable | Rôle |
| --- | --- |
| `MONGODB_URI` | Contenu du CMS, données clients **et** fichiers téléversés (GridFS) |
| `BETTER_AUTH_SECRET` | Signature des sessions **et** des jetons de lien — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | URL de base vue par le navigateur |

Sans `MONGODB_URI`, le site public reste consultable mais vide, et le tableau
de bord affiche une erreur explicite plutôt que de planter.

Le courriel sortant demande `RESEND_API_KEY` et `MAIL_FROM`. **Sans eux, aucun
courriel ne part** — confirmation de devis, notification de message,
infolettre : chaque envoi échoue explicitement plutôt que d'être annoncé comme
réussi, et le tableau de bord le signale en tête de page.

## Premier démarrage

```bash
# 1. Créer le compte administrateur (refuse d'écraser un compte existant)
ADMIN_EMAIL=… ADMIN_PASSWORD=… pnpm bootstrap:admin

# 2. Installer la structure de contenu, sans écraser l'existant
pnpm seed
```

`pnpm seed` est **idempotent** : il n'écrit que ce qui manque (réglages, profil,
composition de l'accueil, pages À propos / Datakle / Engagement / CV,
compétences, liens sociaux désactivés, médias déjà référencés). Il ne crée
aucun projet ni article.

Connectez-vous ensuite sur `/connexion`, puis ouvrez `/admin`. Seul un compte
portant le rôle MongoDB `admin` est admis.

## Espace client

L'inscription est ouverte et ne crée que des comptes **clients** : le rôle est
un champ non modifiable depuis l'entrée, avec une valeur par défaut posée côté
serveur. Les comptes d'administration se créent hors ligne, par
`pnpm bootstrap:admin`.

Un visiteur peut demander un devis sans compte ; il reçoit alors un lien signé
qui lui permet d'ouvrir un compte **rattaché à cette demande**, sans la
dupliquer.

## Documents privés

Deux stockages GridFS cohabitent, délibérément séparés :

| Bucket | Contenu | Accès |
| --- | --- | --- |
| `media` | Illustrations du site | Public, `/api/media/<id>`, cache d'un an |
| `files` | Documents clients, pièces jointes, ressources | Contrôle de droits à chaque requête, `/api/files/<id>`, jamais mis en cache |

Aucune URL publique permanente ne pointe vers un document client : chaque
téléchargement repasse par un contrôle d'appartenance.

## Infolettre

Inscription à double confirmation, désabonnement en un clic par jeton signé,
et envoi par lots. Une campagne fige d'abord la liste de ses destinataires,
puis les traite lot après lot ; l'index unique `(campagne, abonné)` garantit
qu'un envoi relancé ne double personne.

Si l'hébergeur interrompt la tâche de fond, la campagne reste en cours d'envoi
avec sa file. Un planificateur peut la reprendre :

```bash
curl -X POST -H "authorization: Bearer $CRON_SECRET" \
  https://exemple.com/api/newsletter/dispatch
```

Les statistiques d'envoi deviennent réelles — distribué, rejeté, plainte —
dès qu'un webhook Resend est déclaré vers `/api/webhooks/resend` avec son
secret dans `RESEND_WEBHOOK_SECRET`. Chaque appel est vérifié par signature et
horodatage ; sans secret configuré, le point d'entrée refuse tout. Un rejet dur
ou un signalement d'abus ferme définitivement l'adresse côté abonné.

## Médias

Deux origines coexistent dans la bibliothèque :

- **Téléversement** — le fichier est stocké en GridFS (bucket `media`) et servi
  par `/api/media/<id>`. Limite : 10 Mo, JPEG/PNG/WebP/AVIF.
- **Référence externe** — un fichier déjà hébergé (Google Drive, CDN) est
  enregistré par son URL, sans copie. Un lien de partage Drive est
  automatiquement converti en URL d'affichage directe.

Les champs image du CMS acceptent les deux formes. Supprimer un média GridFS
efface le fichier **et** ses fragments (`media.files` et `media.chunks`).

## Vérifications

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

`pnpm test` couvre les fonctions qui décident d'un accès, d'un échappement ou
d'un montant : contrôle d'accès aux fichiers, jetons signés, redirections,
échappement du contenu rédigé, machine à états des devis, arithmétique des
propositions, idempotence des soumissions, table des routes. Ce sont celles où
une régression ne se voit pas à l'écran.

Si Turbopack est bloqué par les restrictions du bac à sable (PostCSS,
ouverture de port), `pnpm exec next build --webpack` reste disponible.

## Sauvegarde

Sauvegardez avant toute opération importante, et testez la restauration hors
production :

```bash
mongodump  --uri "$MONGODB_URI" --out ./sauvegarde
mongorestore --uri "$MONGODB_URI" --drop ./sauvegarde/<nom-de-base>
```

Le dump inclut GridFS : les images téléversées sont couvertes.

## Documentation

Le guide d'utilisation du tableau de bord — écrans, statuts, archivage,
médias, messages — est dans [ADMIN_GUIDE.md](ADMIN_GUIDE.md).
