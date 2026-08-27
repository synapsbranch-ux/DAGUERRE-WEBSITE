# Guide administrateur

## Première connexion

Les comptes appartiennent à **Logto**, pas à ce site. Aucun mot de passe n'est
saisi, stocké ni lisible ici.

Dans la console Logto : créez les rôles `admin` et `customer`, puis attribuez
`admin` à votre compte. C'est ainsi que se crée le premier administrateur.

Renseignez ensuite `.env.local` (voir `.env.example`), puis :

```bash
pnpm db:indexes    # construit et vérifie les index
pnpm sync:users    # remplit le miroir des comptes depuis Logto
pnpm seed          # structure de contenu, sans écraser l'existant
```

Ouvrez `/connexion` — qui vous renvoie vers Logto — puis `/admin`. Seul le rôle
Logto `admin` est admis ; les routes `/api/admin/*` renvoient 401 sans session
et 403 pour tout autre rôle.

`GET /api/health` énumère ce qui manque encore dans la configuration, sans
divulguer aucune valeur.

## Promouvoir ou rétrograder un compte

Fiche du compte dans **Clients**, section « Rôle ». Le changement s'écrit dans
Logto et **prend effet à la prochaine connexion du compte concerné**, pas
immédiatement : son jeton actuel porte encore l'ancien rôle.

Vous ne pouvez pas modifier votre propre rôle. Sur une installation qui ne
compte qu'un administrateur, ce geste fermerait le tableau de bord à tout le
monde sans moyen de revenir en arrière depuis l'application.

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
| Clients | Factures | Brouillon, émission avec PDF, encaissements, annulation |
| Clients | Contrats | Rédaction ou dépôt d'un PDF, envoi en signature, piste d'audit |
| Rendez-vous | Agenda | Semaine, entrées manuelles, abonnement iCalendar |
| Rendez-vous | Réservations | Rendez-vous pris en ligne, annulation avec avis |
| Rendez-vous | Disponibilités | Fuseau, plages hebdomadaires, types de rencontre |
| Marketing | Abonnés | Recherche, filtres, export CSV, désabonnement, réactivation |
| Marketing | Campagnes | Rédaction, aperçu, test, envoi, statistiques réelles |
| Pages | Accueil | Ordre, visibilité et en-têtes de chaque bande |
| Pages | À propos, Datakle, Engagement, CV | Récit, frise, mission/vision, initiatives, parcours, document |
| Réglages | Profil | Identité, bios, portrait, formation, expérience |
| Réglages | Réseaux sociaux | Plateforme, libellé, URL, activation, ordre |
| Réglages | Paramètres | Identité, coordonnées, hero, URL canonique, SEO, pied de page |
| Système | Facturation | Identité de l'émetteur, taxes, délai de paiement, mentions |
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

## Factures

Une facture naît **brouillon** : tant qu'elle l'est, tout se modifie et elle se
supprime. L'émission attribue la date, produit le PDF définitif et l'envoie au
destinataire.

Après émission, **plus rien ne se modifie**. Ce n'est pas une précaution
excessive : le client détient une copie, et en réécrire les montants produirait
un historique qui ne correspond à rien de ce qu'il a reçu. Pour corriger, on
annule et on réémet — le numéro annulé n'est jamais réattribué, pour que la
séquence comptable reste continue.

Les paiements s'enregistrent à la main : montant, moyen, référence, date. Le
solde n'est jamais incrémenté, il se **recalcule** à partir des paiements — ce
qui reste juste après une correction ou une suppression.

Les taxes, l'identité de l'émetteur et les conditions se règlent dans
**Système → Facturation**. Une facture émise en garde sa propre copie : changer
un taux ne réécrit rien de ce qui est déjà parti.

Le planificateur passe en « en retard » les factures échues et non réglées. Sans
`CRON_SECRET`, ce passage n'a jamais lieu et le statut reste « envoyée ».

## Contrats et signature électronique

Un contrat se **rédige ici** en texte, ou s'obtient en **déposant un PDF**. Dans
les deux cas la signature se déroule pareil.

À l'envoi, le document soumis est produit une fois, stocké, et son empreinte
SHA-256 figée. C'est elle qui permet de démontrer plus tard que le document
signé dérive bien de celui que les parties ont lu. Le contrat n'est plus
modifiable ensuite.

Chaque partie reçoit un **lien personnel**. Elle n'a pas de compte et n'a pas à
en créer un : le lien est ce qui l'autorise. On peut imposer un ordre de
signature par un rang ; le rang `0` laisse signer quand on veut.

**Réémettre les liens** sert à deux choses : relancer une partie, et *révoquer*
un lien parti à la mauvaise adresse. Les anciens liens cessent d'aboutir à la
seconde même.

Quand tout le monde a signé, le document est **scellé** : les pages d'origine
sont conservées telles quelles et une piste d'audit est ajoutée à la suite —
identité, courriel, horodatage, adresse IP, navigateur, mode de signature,
empreinte du document. Toutes les parties le reçoivent en pièce jointe.

Un refus interrompt le processus et se consigne au même titre qu'une signature.

**Portée juridique.** Il s'agit d'une signature électronique **simple** au sens
de la LCCJTI (Québec) et du règlement eIDAS. Elle convient à un contrat
commercial ordinaire. Ce n'est **pas** une signature avancée ou qualifiée :
aucun certificat de prestataire de services de confiance n'intervient, et le PDF
ne porte pas de signature cryptographique au sens de la norme PAdES. Ce que le
document prouve, c'est la cohérence d'une piste d'audit — pas une identité
certifiée.

## Agenda et rendez-vous

Trois réglages, dans **Rendez-vous → Disponibilités**, et la page de réservation
en découle entièrement.

1. **Le fuseau de référence.** C'est en lui que s'expriment vos plages. « 9 h à
   17 h » y reste 9 h à 17 h toute l'année, y compris après le changement
   d'heure. Le fuseau du visiteur ne sert qu'à lui afficher les créneaux et à
   lui écrire.
2. **Les plages hebdomadaires.** Un jour, une heure de début, une heure de fin.
3. **Les types de rencontre.** Chacun a sa durée, ses marges avant et après, son
   délai de prévenance, son horizon de réservation et son adresse publique.

Sans les trois, la page de réservation n'a rien à proposer.

Les **entrées d'agenda** bloquent des créneaux sans toucher aux plages : c'est
ainsi qu'on retire une matinée précise. Une entrée issue d'une réservation ne se
déplace ni ne se supprime depuis l'agenda — la personne a reçu une invitation
pour l'heure convenue, et la bouger dans son dos la laisserait fausse chez elle.
Pour changer d'heure, on annule et on reprogramme.

**Annuler** un rendez-vous prévient la personne et retire l'entrée de son
agenda. « Honoré » et « absent » sont des constats internes et n'envoient rien.

L'**abonnement iCalendar** donne une adresse à coller dans Apple Calendrier,
Google Agenda ou Outlook. Elle contient un jeton : traitez-la comme un mot de
passe. Elle ne publie ni notes internes ni coordonnées.

## Ce que l'administration ne peut pas faire

- **Lire un mot de passe.** Ils n'existent pas dans cette base : ils vivent
  chez Logto, hachés, et ne sont récupérables par personne. Un client
  réinitialise le sien depuis l'écran de connexion.
- **Modifier une proposition déjà transmise**, ou en remplacer une acceptée.
- **Créer un compte depuis l'interface.** L'inscription se fait chez Logto ; le
  tableau de bord ne fait qu'attribuer un rôle à un compte existant.
- **Modifier une facture émise**, ni un contrat parti en signature : les deux
  sont détenus par un tiers, et les réécrire produirait un document qui ne
  correspond plus à ce qu'il a reçu.
- **Rouvrir un contrat signé.** Ce que les parties ont approuvé ne change plus.
- **Signer à la place d'un signataire.** Chaque signature vient du lien personnel
  de sa partie, et la piste d'audit consigne d'où elle a été apposée.
