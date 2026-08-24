# Guide administrateur

## Première connexion

Renseignez `MONGODB_URI`, `BETTER_AUTH_SECRET` et `BETTER_AUTH_URL` dans
`.env.local` (voir `.env.example`), puis créez le compte :

```bash
ADMIN_EMAIL=… ADMIN_PASSWORD=… pnpm bootstrap:admin
pnpm seed
```

Ouvrez `/connexion`, puis `/admin`. Seul le rôle MongoDB `admin` est admis ;
les routes `/api/admin/*` renvoient 401 sans session et 403 pour tout autre rôle.

## Les écrans

| Groupe | Écran | Ce qu'on y fait |
| --- | --- | --- |
| Contenus | Articles, Réalisations, Services, Recherche | Fiches éditoriales complètes, avec statut et mise en avant |
| Contenus | Compétences | Nom, catégorie, ordre, activation, icône |
| Contenus | Médias | Téléverser, référencer une URL externe, modifier l'alt, copier l'URL |
| Contenus | Messages | Cycle nouveau → lu → répondu → archivé, réponse par courriel |
| Pages | Accueil | Ordre, visibilité et en-têtes de chaque bande |
| Pages | À propos, Datakle, Engagement, CV | Récit, frise, mission/vision, initiatives, parcours, document |
| Réglages | Profil | Identité, bios, portrait, formation, expérience |
| Réglages | Réseaux sociaux | Plateforme, libellé, URL, activation, ordre |
| Réglages | Paramètres | Identité, coordonnées, hero, URL canonique, SEO, pied de page |

Chaque formulaire est propre à sa ressource : aucun champ n'est détourné d'une
autre entité, et toute erreur de validation s'affiche sous le champ concerné.

## Statuts et visibilité

- **Brouillon** — invisible publiquement.
- **Publié** — visible dès que la date de publication est passée. Une date
  future planifie la parution.
- **Archivé** — retiré du site, conservé et republiable ici.

Un contenu qui n'est pas publié renvoie une **page 404** publiquement, même en
tapant son adresse exacte.

« Archiver » remplace la suppression pour les articles, réalisations, services
et travaux de recherche : rien n'est jamais perdu. Seuls les **médias** et les
**messages** se suppriment définitivement, après confirmation.

## Bilinguisme

Le français est la langue d'édition de référence et reste obligatoire.
L'anglais est facultatif : laissé vide, le site anglais affiche le texte
français. Le slug anglais est également optionnel.

## Médias

- **Téléverser** : le fichier part en GridFS et devient `/api/media/<id>`,
  servi par le site (JPEG, PNG, WebP ou AVIF, 10 Mo maximum).
- **Google Drive / URL** : le fichier reste chez son hébergeur ; un lien de
  partage Drive est converti en URL d'affichage directe. Le fichier doit être
  partagé publiquement.

Les deux formes sont acceptées partout où une image est demandée. Supprimer un
média GridFS efface le fichier et ses fragments : les pages qui l'utilisaient
perdent leur illustration.

Renseignez toujours le texte alternatif français, sauf pour une image purement
décorative.

## Publication et mise à jour du site

Chaque enregistrement invalide précisément les pages concernées : la liste, la
fiche, l'accueil, et l'en-tête ou le pied de page si le changement les touche.
Quand un slug change, l'ancienne adresse **et** la nouvelle sont invalidées.

## Sauvegarde et restauration

Avant toute opération importante :

```bash
mongodump  --uri "$MONGODB_URI" --out ./sauvegarde
mongorestore --uri "$MONGODB_URI" --drop ./sauvegarde/<nom-de-base>
```

Le dump couvre le contenu **et** les fichiers GridFS. Testez la restauration
sur une base de test avant d'en avoir besoin en production.
