# Daguerre

Site bilingue (FR/EN), espace client et CMS privé, sur Next.js 16 (App Router),
TypeScript, Mongoose et Logto. Tout le contenu public vient de MongoDB :
il n'y a pas de contenu de démonstration dans le code.

Trois surfaces partagent une seule base, un seul fournisseur d'identité et un
seul tableau de bord :

- **le site public** — portfolio, Datakle, articles, bibliothèque de ressources,
  inscription à l'infolettre, demande de devis ;
- **l'espace client** (`/espace-client`, `/client` en anglais) — suivi des
  devis, propositions à accepter ou refuser, messagerie, projets, documents,
  notifications, profil ;
- **le tableau de bord** (`/admin`) — contenus, ressources, clients, devis,
  propositions, projets, conversations, factures, contrats, agenda,
  disponibilités, abonnés, campagnes, activité.

S'y ajoutent deux parcours **sans compte**, ouverts par un lien signé : la
signature d'un contrat par une partie externe (`/signature`) et la prise de
rendez-vous en ligne (`/rendez-vous`).

## Prérequis

- Node 20 ou plus
- pnpm 11 ou plus
- Une instance MongoDB (locale ou hébergée)
- Une instance Logto (auto-hébergée ou Logto Cloud)
- Redis, en production seulement — voir « Limitation de débit »

## Installation

```bash
pnpm install
cp .env.example .env.local   # puis renseigner les variables
pnpm dev
```

Les variables sont documentées dans `.env.example`. Cinq sont indispensables :

| Variable | Rôle |
| --- | --- |
| `MONGODB_URI` | Contenu du CMS, données clients **et** fichiers téléversés (GridFS) |
| `NEXT_PUBLIC_SITE_URL` | URL de base vue par le navigateur ; les liens des courriels en dépendent |
| `LOGTO_ENDPOINT` | Instance Logto |
| `LOGTO_APP_ID` / `LOGTO_APP_SECRET` | Application « traditionnelle » créée dans la console |
| `LOGTO_COOKIE_SECRET` | Chiffrement du cookie de session — `openssl rand -base64 32` |

Sans `MONGODB_URI`, le site public reste consultable mais vide, et le tableau
de bord affiche une erreur explicite plutôt que de planter.

`GET /api/health` énumère ce qui manque encore, sans divulguer aucune valeur.

Le courriel sortant demande `RESEND_API_KEY` et `MAIL_FROM`. **Sans eux, aucun
courriel ne part** — confirmation de devis, notification de message,
infolettre : chaque envoi échoue explicitement plutôt que d'être annoncé comme
réussi, et le tableau de bord le signale en tête de page.

## Configurer Logto

Dans la console Logto, une fois :

1. **Application traditionnelle** — noter `App ID` et `App secret`.
   URI de rappel : `<NEXT_PUBLIC_SITE_URL>/api/auth/callback`.
   URI de redirection après déconnexion : `<NEXT_PUBLIC_SITE_URL>/fr`.
2. **Deux rôles utilisateur** : `admin` et `customer`. Attribuer `admin` à votre
   propre compte — c'est ainsi que se crée le premier administrateur, il n'y a
   plus de script pour cela.
3. **Application machine à machine**, avec l'accès à la Management API. Elle
   sert à lister les comptes et à changer un rôle depuis le tableau de bord.
4. **Webhook** vers `<NEXT_PUBLIC_SITE_URL>/api/webhooks/logto`, événements
   `User.Created`, `User.Data.Updated`, `User.Deleted`,
   `User.SuspensionStatus.Updated`. Noter la clé de signature.

## Premier démarrage

```bash
# 1. Construire et vérifier les index (échoue bruyamment si une contrainte
#    d'unicité ne peut pas être posée)
pnpm db:indexes

# 2. Remplir le miroir des comptes depuis Logto
pnpm sync:users

# 3. Installer la structure de contenu, sans écraser l'existant
pnpm seed
```

`pnpm seed` est **idempotent** : il n'écrit que ce qui manque (réglages, profil,
composition de l'accueil, pages À propos / Datakle / Engagement / CV,
compétences, liens sociaux désactivés, médias déjà référencés). Il ne crée
aucun projet ni article.

Connectez-vous ensuite sur `/connexion` — qui vous renvoie vers Logto — puis
ouvrez `/admin`. Seul un compte portant le rôle Logto `admin` est admis.

## Espace client

L'inscription est ouverte et se fait chez Logto. Un compte sans rôle
`admin` est un client : la traduction de la revendication est fermée, si bien
qu'un rôle inconnu — ou une portée `roles` oubliée dans la configuration —
dégrade les droits au lieu de les élargir. Un administrateur se promeut depuis
la fiche du compte, dans `/admin/clients`.

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

Une campagne peut aussi porter une date de départ : elle passe alors en
« programmée » et part toute seule à l'heure dite. Une date déjà passée est
refusée plutôt que lancée immédiatement — elle vient presque toujours d'une
faute de frappe, et un envoi de masse n'est pas une opération sur laquelle on
devine l'intention.

Les statistiques d'envoi deviennent réelles — distribué, rejeté, plainte —
dès qu'un webhook Resend est déclaré vers `/api/webhooks/resend` avec son
secret dans `RESEND_WEBHOOK_SECRET`. Chaque appel est vérifié par signature et
horodatage ; sans secret configuré, le point d'entrée refuse tout. Un rejet dur
ou un signalement d'abus ferme définitivement l'adresse côté abonné.

## Tâches planifiées

Cinq travaux doivent tourner régulièrement, et c'est un seul point d'entrée
qui les porte :

1. **reprise** d'une campagne interrompue par l'hébergeur ;
2. **départ** des campagnes programmées ;
3. **péremption** des propositions dont la date de validité est passée ;
4. **passage en retard** des factures échues et non réglées ;
5. **fermeture** des contrats dont la date limite est passée.

Chacun est idempotent : deux exécutions concurrentes ne peuvent pas faire
partir une campagne deux fois. Fréquence conseillée : toutes les cinq minutes.

`vercel.json` et `.github/workflows/cron.yml` sont fournis. Pour tout autre
planificateur :

```bash
curl -H "authorization: Bearer $CRON_SECRET" https://exemple.com/api/cron
```

**Sans `CRON_SECRET`, ces cinq tâches ne tournent jamais** : les campagnes
programmées ne partent pas, les propositions n'expirent pas, aucune facture ne
passe « en retard », et un contrat périmé reste affiché « en attente de
signature ».

## Facturation

Les montants sont en **unités mineures entières** (cents) : additionner des
flottants finit toujours par produire un écart d'un cent qu'aucun comptable
n'accepte. Les taux de taxe sont en **parties par million**, parce que la TVQ
vaut 9,975 % — 997,5 points de base, ce qui n'est pas entier et ruinerait
l'argument.

Les taxes s'appliquent **en parallèle** sur la base imposable, jamais en
cascade : depuis 2013, la TPS et la TVQ portent toutes deux sur le montant
avant taxes.

Une facture émise est figée. Elle ne se modifie plus, et son numéro n'est jamais
réattribué : la séquence comptable doit rester continue. Le montant réglé se
**recalcule** à partir des paiements plutôt que de s'incrémenter — ce qui reste
juste après une correction.

Le PDF est produit par `pdf-lib`, sans navigateur sans affichage : quelques
millisecondes et une trentaine de mégaoctets, contre plusieurs secondes et
plusieurs centaines pour un Chromium.

## Signature électronique

Une partie externe n'a pas de compte. Ce qui l'autorise, c'est un **jeton signé**
qui la désigne, et rien d'autre. Trois conséquences tenues dans le code :

- le sujet du jeton compose l'identifiant du signataire **et** la version de son
  jeton, si bien qu'incrémenter `tokenVersion` révoque d'un coup tous les liens
  déjà envoyés, sans table de jetons à purger ;
- le jeton expire — une capacité qui engage une partie n'a pas à être
  éternelle ;
- il n'ouvre **que** ce document, et n'accorde aucun droit de lecture ailleurs.

À l'envoi, le PDF réellement soumis est produit une fois, stocké, et son
empreinte SHA-256 conservée. Le document scellé dérive de celui-là, et le
prouve.

`pdf-lib` a été retenu pour une raison précise : il sait **ouvrir un PDF déposé
par un client** et lui ajouter des pages sans réécrire les siennes. Le contenu
d'origine est préservé octet pour octet ; la piste d'audit est ajoutée à la
suite, jamais superposée — écrire par-dessus le texte d'un contrat pourrait en
masquer une clause.

**Un tracé de signature est validé avant d'être conservé.** Le décodeur PNG de
`pdf-lib` boucle indéfiniment sur certaines entrées malformées : ni `try/catch`
ni minuterie n'y peuvent quoi que ce soit, JavaScript étant mono-fil. Comme le
tracé vient d'un signataire sans compte, quelques kilooctets suffiraient à
immobiliser un travailleur serveur. `lib/pdf/png.ts` décompresse donc lui-même
le flux avec le zlib natif — qui lève au lieu de boucler — et vérifie que la
taille obtenue correspond exactement à ce que l'en-tête annonce.

Portée juridique : signature électronique **simple** au sens de la LCCJTI
(Québec) et du règlement eIDAS. Ni avancée, ni qualifiée, ni PAdES.

## Rendez-vous

Le fuseau horaire est le sujet, pas un détail d'affichage. Une plage « le mardi
de 9 h à 17 h » est locale au fuseau de l'entreprise et le reste toute l'année ;
la stocker en UTC la décalerait d'une heure deux fois par an. Les règles sont
donc en minutes depuis minuit, converties vers UTC **pour une date donnée**, en
interrogeant le fuseau à cette date-là. `Intl` embarque déjà la base IANA :
aucune bibliothèque de fuseaux n'est nécessaire, et n'en ajouter aucune évite
d'en avoir une périmée par rapport à celle du système.

`lib/platform/scheduling.ts` est **pur et sans accès à la base** — les
intervalles occupés lui sont fournis. C'est ce qui le rend exhaustivement
testable.

Trois contrôles à la réservation, dont aucun n'est redondant : le créneau est-il
proposé, est-il encore libre au moment d'écrire, et l'index unique sur la clé de
soumission pour absorber le double clic. La liste affichée au visiteur n'est
qu'un confort ; elle peut avoir plusieurs minutes de retard.

L'invitation d'agenda part en pièce jointe (`REQUEST`), et l'annulation aussi
(`CANCEL`, même UID) — sans quoi l'entrée resterait dans l'agenda du
destinataire, qui se présenterait.

## Limitation de débit

Les formulaires publics — devis, infolettre, contact, messagerie — sont
limités par fenêtre glissante. Le comptage passe par Redis (`REDIS_URL`, ou
`UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`).

Sans Redis, le comptage retombe en mémoire du processus, avec un avertissement
au démarrage. **C'est acceptable en développement, pas en production** : avec N
instances, chacune tient son propre compteur, la limite réelle vaut N fois
celle annoncée, et il suffit de répartir ses requêtes pour l'annuler.

Si Redis est configuré mais injoignable, la requête est autorisée et
l'incident journalisé : un magasin de limitation en panne ne doit pas fermer le
site.

## Index

```bash
pnpm db:indexes
```

Mongoose construit ses index paresseusement et **avale l'échec** : un index
unique refusé — doublons déjà en base, expression rejetée par le serveur —
laisse l'application tourner sans la contrainte qu'elle croit avoir. Ce script
les construit, vérifie nommément les neuf contraintes dont dépend la logique
métier — anti-double-soumission d'un devis et d'une réservation, unicité des
numéros de facture et de contrat, une adresse par signataire — et sort en
erreur si l'une manque. À exécuter au déploiement.

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

`pnpm test` couvre les fonctions qui décident d'un accès, d'un échappement, d'un
montant ou d'une heure : contrôle d'accès aux fichiers, jetons signés,
redirections, échappement du contenu rédigé, machine à états des devis,
arithmétique des propositions et des factures, idempotence des soumissions,
table des routes, traduction de la revendication de rôle Logto, signature des
webhooks, secret des tâches planifiées, validation des images de signature,
révocation d'un lien de signature, ordre de signature, et calcul des créneaux —
décalages effectifs, fuseaux à demi-heure, changement d'heure dans les deux
sens, marges, délai de prévenance, horizon. Ce sont celles où une régression ne
se voit pas à l'écran.

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

Le guide d'utilisation du tableau de bord — écrans, statuts, archivage, médias,
messages, factures, contrats, agenda — est dans
[ADMIN_GUIDE.md](ADMIN_GUIDE.md).
