# Portfolio Daguerre

Site vitrine bilingue (FR/EN) et son CMS privé, sur Next.js 16 (App Router),
TypeScript, Mongoose et Better Auth. Tout le contenu public vient de MongoDB :
il n'y a pas de contenu de démonstration dans le code.

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
| `MONGODB_URI` | Contenu du CMS **et** fichiers téléversés (GridFS) |
| `BETTER_AUTH_SECRET` | Signature des sessions — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | URL de base vue par le navigateur |

Sans `MONGODB_URI`, le site public reste consultable mais vide, et le tableau
de bord affiche une erreur explicite plutôt que de planter.

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
pnpm exec next build --webpack
```

Le build passe par webpack : Turbopack peut être bloqué par les restrictions
de bac à sable (PostCSS, ouverture de port) selon l'environnement.

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
