/**
 * Dictionnaire français — chaînes d'interface.
 *
 * Il ne contient que le « chrome » du site : libellés, intitulés de sections,
 * messages d'état. Le contenu rédactionnel (accueil, articles, projets) vient
 * de la base de données et se traduit depuis le tableau de bord.
 *
 * Ce module fait référence : `en.ts` doit en satisfaire le type.
 */
export const fr = {
  common: {
    skipToContent: "Aller au contenu",
    menu: "Menu",
    close: "Fermer",
    comingSoon: "Contenu en préparation.",
    empty: "Rien à afficher pour l'instant.",
    previousPage: "Page précédente",
    nextPage: "Page suivante",
    pagination: "Pagination",
    filters: "Filtres",
    allFilter: "Tous",
    resetFilters: "Réinitialiser",
    resultCount: "résultat(s)",
    readMore: "Lire",
    backToBlog: "Retour au blogue",
    allProjects: "Tout le portfolio",
    allArticles: "Tous les articles",
    contactCta: "Parler de votre projet",
    downloadCv: "Télécharger le CV (PDF)",
    language: "Langue",
    search: "Rechercher",
    searchPlaceholder: "Rechercher un article…",
    publishedOn: "Publié le",
    readingTime: "min de lecture",
    breadcrumb: "Fil d'Ariane",
    mainNav: "Navigation principale",
    footerNav: "Navigation du pied de page",
  },

  footer: {
    navigation: "Navigation",
    presence: "Présence numérique",
    resources: "Ressources",
    legal: "Informations légales",
    rights: "Tous droits réservés.",
  },

  notFound: {
    eyebrow: "Erreur 404",
    title: "Page introuvable",
    body: "La page que vous cherchez n'existe pas, a été déplacée ou son adresse a changé.",
    cta: "Retour à l'accueil",
    goTo: "Aller directement à",
  },

  /*
   * Textes de l'accueil, repris de la maquette.
   * Ils servent de valeurs par défaut : dès qu'une section est renseignée dans
   * le tableau de bord, c'est la base de données qui l'emporte.
   */
  home: {
    hero: {
      eyebrow: "Analytique d’affaires · Datakle",
      title: "La donnée devient utile quand elle mène à une décision claire.",
      lead: "J’aide les PME, ONG et institutions à structurer leurs données, automatiser leur pilotage et donner à leurs équipes les moyens d’agir.",
      primaryCta: "Parler de votre projet",
      secondaryCta: "Découvrir les services",
      tertiaryCta: "Voir les réalisations",
      portraitAlt: "Jacques-Daguerre dans un environnement analytique",
      /* Mots égrenés par le rideau d'ouverture (Ruixen « Arc Reveal Hero »). */
      greetings: ["Données.", "Méthode.", "Décision."],
    },
    proof: {
      label: "Expertise mobilisable",
      items: ["Power BI", "SQL", "Automatisation", "Analytique d’affaires", "Accompagnement"],
    },
    dataDecisions: {
      eyebrow: "Du problème à l’action",
      title: "Vos données existent déjà. Leur valeur reste à organiser.",
      lead: "Rapports manuels, indicateurs contradictoires ou informations dispersées ralentissent les équipes. Une démarche analytique solide remet chaque décision sur une base partagée.",
      /* Chaîne de traitement affichée par le panneau Ruixen. */
      pipeline: [
        { label: "Données brutes", detail: "Fichiers, exports et saisies, tels qu'ils arrivent." },
        { label: "Nettoyage", detail: "Doublons, valeurs manquantes et formats remis d'aplomb." },
        { label: "Structuration", detail: "Un modèle commun, des définitions partagées." },
        { label: "Modélisation", detail: "Règles de calcul et indicateurs, écrits une seule fois." },
        { label: "Analyse", detail: "Lecture des écarts, des tendances et de leurs causes." },
        { label: "Décision", detail: "Un arbitrage documenté, puis la mesure de son effet." },
      ],
      steps: [
        { label: "Comprendre", detail: "Clarifier la question, les usages et les décisions à soutenir." },
        { label: "Structurer", detail: "Fiabiliser les sources, les règles de calcul et les indicateurs." },
        { label: "Activer", detail: "Livrer un outil lisible, automatisé et pris en main par l’équipe." },
      ],
      result: "Résultat : moins de temps passé à produire l’information, plus de confiance pour l’utiliser.",
    },
    strip: {
      contact: "Coordonnées",
      mandates: "Mandats & propositions — Datakle",
    },
    about: {
      eyebrow: "À propos",
      statement:
        "Un parcours entre terrain, recherche et analytique — avec une même exigence : rendre la décision plus solide.",
      body: [
        "Ingénieur-agronome spécialisé en économie et titulaire d’un MBA en analytique d’affaires, je relie la compréhension du terrain à la rigueur des données.",
        "Avec Datakle, j’accompagne les organisations du cadrage jusqu’au transfert de compétences, pour que les outils restent réellement utiles après leur livraison.",
      ],
      photoCaption: "Analyse · stratégie · transfert de compétences",
      photoAlt: "Jacques-Daguerre, analyste de données et fondateur de Datakle",
      cta: "Découvrir mon parcours",
      facts: [
        { title: "Analytique d’affaires", detail: "MBA et pratique appliquée" },
        { title: "Approche terrain", detail: "Agronomie, économie et recherche" },
        { title: "Outils", detail: "Power BI · SQL · automatisation" },
        { title: "Langues", detail: "Français · créole · anglais" },
      ],
    },
    projects: {
      eyebrow: "Réalisations",
      title: "Trois mandats, trois manières de décider mieux",
    },
    datakle: {
      eyebrow: "Services — Datakle",
      title: "Datakle",
      lead: "Mon cabinet de services de données : cadrage, construction et transfert de compétences pour les organisations qui n'ont pas d'équipe analytique — PME, ONG, institutions publiques.",
      primaryCta: "Demander une proposition",
      secondaryCta: "Grille tarifaire",
      services: [
        {
          title: "Tableaux de bord",
          detail: "Indicateurs cadrés, visuels lisibles, une source unique de vérité.",
        },
        {
          title: "Qualité des données",
          detail: "Nettoyage, modélisation, contrôles automatiques.",
        },
        {
          title: "Automatisation",
          detail: "Rapports récurrents produits sans intervention humaine.",
        },
        { title: "Formation", detail: "Vos équipes deviennent autonomes sur l'outil livré." },
      ],
    },
    engagement: {
      eyebrow: "Engagement social",
      statement:
        "La donnée est un bien public quand elle sert à décider pour une communauté. Je consacre une part de mon temps aux organisations haïtiennes qui n'ont pas les moyens d'un cabinet.",
      cta: "Proposer une collaboration",
      photoAlt: "Atelier, formation, terrain",
    },
    blog: {
      eyebrow: "Blogue",
      title: "Notes sur la donnée et la décision",
    },
    social: {
      title: "Réseaux sociaux",
      description: "Retrouvez mes publications et projets sur ces plateformes.",
    },
  },

  pages: {
    /** Libellés partagés par les pages éditoriales pilotées depuis le CMS. */
    editorial: {
      timeline: "Parcours",
      gallery: "Images",
      empty:
        "Cette page n’a pas encore de contenu. Elle se remplit depuis le tableau de bord, dans la section Pages.",
    },
    about: {
      eyebrow: "À propos",
      title: "Mon parcours",
      description:
        "De l'agronomie à l'analytique d'affaires : un fil conducteur, comprendre les systèmes et outiller la décision.",
      metaTitle: "À propos",
      metaDescription:
        "Parcours d'ingénieur-agronome spécialisé en économie, MBA en analytique d'affaires : recherche, analyse de données, gestion de projet et stratégie, d'Haïti au Québec.",
      sections: {
        introduction: "Introduction",
        agronome: "Diplôme d'ingénieur-agronome",
        economie: "Spécialisation en économie",
        projet: "Gestion de projet",
        suivi: "Suivi-évaluation",
        recherche: "Recherche",
        donnees: "Analyse de données",
        mba: "MBA en analytique d'affaires",
        strategie: "Stratégie",
        efficacite: "Efficacité et amélioration continue",
        parcours: "Parcours : Haïti → Québec",
        experiences: "Expériences professionnelles",
        valeurs: "Valeurs",
        mentorat: "Mentorat et influences",
      },
    },

    projects: {
      eyebrow: "Portfolio",
      title: "Réalisations",
      description:
        "Une sélection de projets : analyse, visualisation, automatisation et accompagnement d'organisations.",
      metaTitle: "Réalisations",
      metaDescription:
        "Projets d'analyse de données, tableaux de bord, outils d'automatisation et missions de gestion de projet réalisés pour des organisations.",
      filters: "Filtres",
      filtersHint: "Filtrage par catégorie, technologie et année.",
      categories: "Catégories",
      technologies: "Technologies",
      year: "Année",
      featured: "Projets mis en avant",
      featuredHint: "Les réalisations les plus représentatives.",
      all: "Tous les projets",
      allHint:
        "Chaque projet dispose d'une page détaillée : contexte, approche, résultats, technologies et liens.",
      emptyFeatured: "Aucun projet mis en avant pour l'instant.",
      empty: "Projets à venir.",
      detail: {
        eyebrow: "Réalisation",
        fallbackDescription: "Page détaillée du projet.",
        sections: {
          presentation: "Présentation",
          probleme: "Problème",
          methode: "Méthodologie",
          resultats: "Résultats",
          lecons: "Leçons apprises",
          galerie: "Galerie",
          stack: "Technologies et catégories",
          client: "Client",
          role: "Rôle",
          lien: "Voir le projet",
          related: "Réalisations liées",
          previous: "Réalisation précédente",
          next: "Réalisation suivante",
          pagination: "Navigation entre réalisations",
        },
      },
    },

    datakle: {
      eyebrow: "Projet",
      title: "Datakle",
      description: "Rendre la donnée accessible, compréhensible et utile aux organisations.",
      metaTitle: "Datakle",
      metaDescription:
        "Datakle : démocratiser la donnée. Mission, vision, services, valeurs et projets au service des organisations et du développement d'Haïti.",
      seeServices: "Voir les services",
      collaborate: "Collaborons",
      collaborateBody: "Vous souhaitez travailler avec Datakle ou proposer un partenariat ?",
      collaborateCta: "Prendre contact",
      sections: {
        presentation: "Présentation",
        mission: "Mission",
        vision: "Vision",
        services: "Services",
        valeurs: "Valeurs",
        projets: "Projets",
        haiti: "Vision pour Haïti",
        collaboration: "Collaboration",
      },
    },

    services: {
      eyebrow: "Datakle",
      title: "Services",
      description:
        "Des offres pensées pour les organisations qui veulent structurer, comprendre et exploiter leurs données.",
      metaTitle: "Services Datakle",
      metaDescription:
        "Accompagnement en analyse de données, business intelligence, tableaux de bord, automatisation, formation et suivi-évaluation.",
      catalogue: "Catalogue des services",
      catalogueHint:
        "Chaque service dispose d'une page détaillée : périmètre, livrables et déroulement.",
      empty: "Services à venir.",
      detail: {
        eyebrow: "Service Datakle",
        fallbackDescription: "Page détaillée du service.",
        sections: {
          presentation: "Présentation",
          contenu: "Ce que comprend le service",
          livrables: "Livrables",
        },
      },
    },

    blog: {
      eyebrow: "Blogue",
      title: "Articles",
      description:
        "Notes de terrain, méthodes et réflexions sur la donnée et la gestion de projet.",
      metaTitle: "Blogue",
      metaDescription:
        "Articles et analyses sur l'analyse de données, la business intelligence, la gestion de projet, le suivi-évaluation et la recherche.",
      featured: "Articles mis en avant",
      recent: "Articles récents",
      categories: "Catégories",
      tags: "Tags",
      emptyFeatured: "Aucun article mis en avant pour l'instant.",
      empty: "Articles à venir.",
      emptyCategories: "Aucune catégorie disponible.",
      emptyTags: "Aucun tag disponible.",
      article: {
        eyebrow: "Article",
        fallbackDescription: "Page de l'article.",
        content: "Contenu",
        taxonomies: "Catégories et tags",
        related: "Articles liés",
      },
      category: {
        eyebrow: "Catégorie",
        description: "Tous les articles de cette catégorie.",
        empty: "Aucun article dans cette catégorie pour l'instant.",
      },
      tag: {
        eyebrow: "Tag",
        description: "Tous les articles associés à ce tag.",
        empty: "Aucun article pour ce tag pour l'instant.",
      },
    },

    engagement: {
      eyebrow: "Engagement",
      title: "Engagement social",
      description: "Mettre les compétences et la donnée au service des communautés.",
      metaTitle: "Engagement social",
      metaDescription:
        "Développement d'Haïti, éducation, mentorat, démocratisation de la donnée et initiatives communautaires.",
      sections: {
        pourquoi: "Pourquoi je m'engage",
        haiti: "Développement d'Haïti",
        education: "Éducation",
        mentorat: "Mentorat",
        democratisation: "Démocratisation de la donnée",
        initiatives: "Initiatives communautaires",
        valeurs: "Valeurs humaines",
      },
      galleryHint: "Faites défiler pour voir le terrain",
    },

    cv: {
      eyebrow: "Parcours",
      title: "Curriculum vitæ",
      description: "Un aperçu structuré de la formation, des expériences et des compétences.",
      metaTitle: "CV",
      metaDescription:
        "Profil, formation, expériences professionnelles, compétences, certifications et projets. CV téléchargeable en PDF.",
      sections: {
        profil: "Profil",
        formation: "Formation",
        experiences: "Expériences professionnelles",
        competences: "Compétences",
        certifications: "Certifications",
        projets: "Projets",
      },
    },

    research: {
      eyebrow: "Recherche",
      title: "Travaux de recherche",
      description:
        "Méthodes, publications et études menées en agronomie, économie et analyse de données.",
      metaTitle: "Recherche",
      metaDescription:
        "Travaux de recherche, mémoire, publications, études, méthodologies, documents et conférences.",
      sections: {
        travaux: "Travaux de recherche",
        memoire: "Mémoire",
        publications: "Publications",
        etudes: "Études",
        methodologies: "Méthodologies",
        documents: "Documents",
        conferences: "Conférences",
      },
    },

    skills: {
      eyebrow: "Savoir-faire",
      title: "Compétences",
      description: "Les domaines dans lesquels j'interviens, des données brutes à la décision.",
      metaTitle: "Compétences",
      metaDescription:
        "Data analytics, business intelligence, visualisation, Excel/VBA, SQL, Python, gestion de projet, suivi-évaluation, recherche et stratégie.",
      categories: "Catégories",
      todo: "Les détails seront ajoutés à cette entrée.",
      explore: "Explorer par compétence",
      explorePlaceholder: "Choisir des compétences…",
    },

    contact: {
      eyebrow: "Contact",
      title: "Me contacter",
      description:
        "Un projet, une question ou une envie de collaborer ? Le plus simple est de m'écrire.",
      metaTitle: "Contact",
      metaDescription:
        "Écrivez-moi pour un projet de données, une collaboration ou une mission d'accompagnement en analyse et gestion de projet.",
      form: "Formulaire",
      name: "Nom",
      organisation: "Organisation",
      email: "Courriel",
      subject: "Objet",
      message: "Message",
      send: "Envoyer",
      optional: "Optionnel",
      subjectMandate: "Mandat",
      subjectJob: "Emploi",
      subjectOther: "Autre",
      messagePlaceholder: "Ce que vous cherchez à décider…",
      otherWays: "Autres moyens de me joindre",
      booking: "Prendre rendez-vous",
      bookingHint: "Emplacement prévu pour une intégration Calendly.",
      phone: "Téléphone",
      basedIn: "Basé à",
      agenda: "Agenda",
      sent: "Message envoyé. Merci, je réponds rapidement.",
      error: "L'envoi a échoué. Réessayez ou écrivez-moi directement.",
    },

    links: {
      eyebrow: "Liens",
      title: "Tous mes liens",
      description: "Le point d'entrée unique vers mes profils, publications et ressources.",
      metaTitle: "Liens",
      metaDescription:
        "Tous mes liens en un seul endroit : LinkedIn, GitHub, YouTube, Medium, Instagram.",
      networks: "Réseaux",
      networksHint: "Mes profils publics.",
      networksEmpty: "Aucun profil public n’est activé pour le moment.",
      resources: "Ressources du site",
    },

    legal: {
      eyebrow: "Informations légales",
      title: "Mentions légales",
      description: "Cette page sera complétée avec les informations légales définitives.",
      metaTitle: "Mentions légales",
      metaDescription: "Éditeur du site, hébergement, propriété intellectuelle et responsabilité.",
      sections: {
        editeur: "Éditeur du site",
        hebergement: "Hébergement",
        propriete: "Propriété intellectuelle",
        responsabilite: "Limitation de responsabilité",
        contact: "Contact",
      },
    },

    privacy: {
      eyebrow: "Informations légales",
      title: "Politique de confidentialité",
      description:
        "Cette page sera complétée lorsque les traitements de données du site seront définis.",
      metaTitle: "Politique de confidentialité",
      metaDescription:
        "Données collectées, finalités, durée de conservation, cookies et droits des personnes.",
      sections: {
        donnees: "Données collectées",
        finalites: "Finalités du traitement",
        conservation: "Durée de conservation",
        cookies: "Cookies et mesure d'audience",
        partage: "Partage des données",
        droits: "Vos droits",
        contact: "Contact",
      },
    },
  },
};

/**
 * Forme du dictionnaire, inférée depuis le français.
 *
 * Volontairement **sans** `as const` : figer les chaînes en types littéraux
 * rendrait toute traduction anglaise incompatible.
 */
export type Dictionary = typeof fr;
