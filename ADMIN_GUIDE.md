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
| Contenus | Ressources | Bibliothèque : dépôt de documents, portée, catégories, publication, téléchargements |
| Contenus | Médias | Téléverser, référencer une URL externe, modifier l'alt, copier l'URL |
| Contenus | Messages | Contact public : nouveau → lu → répondu → archivé |
| Clients | Clients | Comptes ouverts sur le site, avec devis, projets, conversations et téléchargements |
| Clients | Devis | File des demandes, poste de travail, propositions, conversion en projet |
| Clients | Projets | Fiche, avancements publiés, documents privés |
| Clients | Conversations | Boîte de réception client, réponses, fermeture |
| Marketing | Abonnés | Recherche, filtres, export CSV, désabonnement, réactivation |
| Marketing | Campagnes | Rédaction, aperçu, test, envoi, statistiques réelles |
| Pages | Accueil | Ordre, visibilité et en-têtes de chaque bande |
| Pages | À propos, Datakle, Engagement, CV | Récit, frise, mission/vision, initiatives, parcours, document |
| Réglages | Profil | Identité, bios, portrait, formation, expérience |
| Réglages | Réseaux sociaux | Plateforme, libellé, URL, activation, ordre |
| Réglages | Paramètres | Identité, coordonnées, hero, URL canonique, SEO, pied de page |
| Système | Activité | Journal des actions administratives |

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

## Devis

Une demande suit une **machine à états** : depuis chaque état, seules les
suites possibles sont proposées, et le serveur les revérifie. Un dossier clos
— refusé, expiré, annulé, converti — ne se rouvre pas.

Deux endroits distincts, à ne pas confondre :

- **Conversation** — visible du client, notifiée et relayée par courriel.
- **Notes internes** — collection séparée, qu'aucune page de l'espace client
  n'interroge. Ce n'est pas un affichage masqué : ces notes ne sont jamais lues
  par le code qui sert le client.

Un devis se construit en lignes structurées (libellé, quantité, prix
unitaire). Les totaux sont recalculés par le serveur : l'aperçu à l'écran ne
fait pas foi. Enregistrer et **transmettre** sont deux gestes séparés, et une
proposition transmise ne se modifie plus — une révision passe par une nouvelle
version. Une proposition acceptée ferme le dossier.

Un devis accepté peut devenir un **projet**, une seule fois.

## Ressources et documents

Une ressource porte soit un fichier déposé, soit une URL externe, et une
portée :

- **Public** — téléchargeable sans compte ;
- **Comptes connectés** — réservée à tout compte client ;
- **Clients autorisés** — réservée aux comptes nommément désignés.

Les documents déposés sur un dossier de devis ou un projet suivent leur objet :
seul le client concerné y accède. Aucun n'a d'URL publique permanente ; chaque
téléchargement repasse par un contrôle de droits.

Une ressource se retire par **archivage**, jamais par suppression : le fichier
a pu être distribué, et l'historique des téléchargements y renvoie.

## Infolettre

L'inscription exige un consentement explicite **et** une confirmation par
courriel. Aucun autre parcours du site n'abonne personne : ni la création d'un
compte, ni une demande de devis, ni un téléchargement — chacun porte sa propre
case, décochée.

Avant d'envoyer une campagne : prévisualisez, envoyez-vous un test, puis
ouvrez la boîte de confirmation. Elle affiche la campagne, l'audience et le
**nombre réel** de destinataires, compté en base à cet instant. L'envoi n'est
proposé que depuis la fiche d'une campagne, jamais au bout d'une ligne de
tableau.

Un envoi relancé ne double personne : la liste des destinataires est figée
sous un index unique. Le statut de chaque abonné est revérifié juste avant
l'envoi, donc un désabonnement intervenu entre-temps est respecté.

Les compteurs « distribué », « rejeté » et « plainte » reflètent ce que le
fournisseur d'envoi rapporte, à condition qu'un webhook soit déclaré (voir le
README). Sans lui, ils restent à zéro — ce qui signifie « non mesuré », pas
« aucun ».

Les taux d'ouverture et de clic ne sont pas affichés : les mesurer demanderait
un pixel de suivi et une redirection des liens, qui ne sont pas en place.
Mieux vaut pas de chiffre qu'un chiffre inventé.

Le désabonnement se fait en un clic depuis n'importe quel envoi, sans
connexion. Il ne coupe **aucun** courriel de service : confirmations de devis,
propositions et notifications de message continuent d'arriver.

## Courriel

Sans `RESEND_API_KEY` et `MAIL_FROM`, aucun courriel ne part. L'interface le
dit — en tête du tableau de bord, et en refusant de lancer une campagne —
plutôt que d'annoncer des envois qui n'ont pas eu lieu.

## Journal d'activité

Les actions sensibles sont tracées : changement de statut d'un devis, envoi
d'une proposition, publication d'une ressource, envoi d'une infolettre, dépôt
d'un document client, création d'un projet. Le journal ne contient ni mot de
passe, ni jeton, ni contenu de message privé — il sert à retracer une décision,
pas à dupliquer les données qu'elle concerne.

## Ce que l'administration ne peut pas faire

- **Lire un mot de passe.** Ils sont hachés par Better Auth et ne sont pas
  récupérables. Un client le réinitialise lui-même depuis la page de connexion.
- **Modifier une proposition déjà transmise**, ou en remplacer une acceptée.
- **Créer un compte administrateur depuis l'interface** : cela passe par
  `pnpm bootstrap:admin`, hors ligne.
