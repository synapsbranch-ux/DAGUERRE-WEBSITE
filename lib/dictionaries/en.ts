import type { Dictionary } from "@/lib/dictionaries/fr";

/**
 * English dictionary.
 *
 * The `satisfies Dictionary` assertion guarantees this file stays structurally
 * identical to `fr.ts` — a missing key becomes a build error.
 */
export const en = {
  common: {
    skipToContent: "Skip to content",
    menu: "Menu",
    close: "Close",
    comingSoon: "Content is being prepared.",
    empty: "Nothing to show yet.",
    previousPage: "Previous page",
    nextPage: "Next page",
    pagination: "Pagination",
    filters: "Filters",
    allFilter: "All",
    resetFilters: "Reset",
    resultCount: "result(s)",
    readMore: "Read",
    backToBlog: "Back to the blog",
    allProjects: "Full portfolio",
    allArticles: "All articles",
    contactCta: "Discuss your project",
    downloadCv: "Download résumé (PDF)",
    language: "Language",
    search: "Search",
    searchPlaceholder: "Search articles…",
    publishedOn: "Published on",
    readingTime: "min read",
    breadcrumb: "Breadcrumb",
    mainNav: "Main navigation",
    footerNav: "Footer navigation",
  },

  footer: {
    navigation: "Navigation",
    presence: "Online presence",
    resources: "Resources",
    legal: "Legal",
    rights: "All rights reserved.",
  },

  notFound: {
    eyebrow: "Error 404",
    title: "Page not found",
    body: "The page you are looking for does not exist, has moved, or its address has changed.",
    cta: "Back to home",
    goTo: "Go straight to",
  },

  home: {
    hero: {
      eyebrow: "Business analytics · Datakle",
      title: "Data becomes useful when it leads to a clear decision.",
      lead: "I help small businesses, NGOs and institutions structure their data, automate performance management and give their teams the means to act.",
      primaryCta: "Discuss your project",
      secondaryCta: "Explore services",
      tertiaryCta: "View selected work",
      portraitAlt: "Jacques-Daguerre in a data analytics environment",
      /* Mots égrenés par le rideau d'ouverture (Ruixen « Arc Reveal Hero »). */
      greetings: ["Data.", "Method.", "Decision."],
    },
    proof: {
      label: "Expertise on demand",
      items: ["Power BI", "SQL", "Automation", "Business analytics", "Team enablement"],
    },
    dataDecisions: {
      eyebrow: "From problem to action",
      title: "Your data already exists. Its value still needs structure.",
      lead: "Manual reporting, conflicting metrics and scattered information slow teams down. A sound analytics process gives every decision a shared foundation.",
      /* Chaîne de traitement affichée par le panneau Ruixen. */
      pipeline: [
        { label: "Raw data", detail: "Files, exports and manual entries, exactly as they arrive." },
        { label: "Cleaning", detail: "Duplicates, missing values and formats put back in order." },
        { label: "Structuring", detail: "One shared model, one set of agreed definitions." },
        { label: "Modelling", detail: "Calculation rules and indicators, written once." },
        { label: "Analysis", detail: "Reading the gaps, the trends and what causes them." },
        { label: "Decision", detail: "A documented call, then a measure of its effect." },
      ],
      steps: [
        { label: "Understand", detail: "Clarify the question, the users and the decisions to support." },
        { label: "Structure", detail: "Make sources, calculation rules and indicators reliable." },
        { label: "Activate", detail: "Deliver a clear, automated tool the team can confidently own." },
      ],
      result: "The result: less time producing information, more confidence using it.",
    },
    strip: {
      contact: "Contact details",
      mandates: "Assignments & proposals — Datakle",
    },
    about: {
      eyebrow: "About",
      statement:
        "A path across field work, research and analytics — with one constant: making decisions more robust.",
      body: [
        "An agricultural engineer specialised in economics with an MBA in business analytics, I connect a field perspective with the discipline of data.",
        "Through Datakle, I work with organisations from initial framing to skills transfer, so the tools remain genuinely useful after delivery.",
      ],
      photoCaption: "Analytics · strategy · skills transfer",
      photoAlt: "Jacques-Daguerre, data analyst and founder of Datakle",
      cta: "Discover my journey",
      facts: [
        { title: "Business analytics", detail: "MBA and applied practice" },
        { title: "Field perspective", detail: "Agronomy, economics and research" },
        { title: "Tools", detail: "Power BI · SQL · automation" },
        { title: "Languages", detail: "French · Creole · English" },
      ],
    },
    projects: {
      eyebrow: "Selected work",
      title: "Three assignments, three ways to decide better",
    },
    datakle: {
      eyebrow: "Services — Datakle",
      title: "Datakle",
      lead: "My data services practice: framing, building and transferring skills for organisations without an analytics team — SMEs, NGOs, public institutions.",
      primaryCta: "Request a proposal",
      secondaryCta: "Rate card",
      services: [
        {
          title: "Dashboards",
          detail: "Framed indicators, legible visuals, a single source of truth.",
        },
        { title: "Data quality", detail: "Cleaning, modelling, automated checks." },
        { title: "Automation", detail: "Recurring reports produced without human intervention." },
        { title: "Training", detail: "Your teams become autonomous on the delivered tool." },
      ],
    },
    engagement: {
      eyebrow: "Social commitment",
      statement:
        "Data is a public good when it serves decisions made for a community. I devote part of my time to Haitian organisations that cannot afford a consultancy.",
      cta: "Propose a collaboration",
      photoAlt: "Workshop, training, field",
    },
    blog: {
      eyebrow: "Blog",
      title: "Notes on data and decisions",
    },
    social: {
      title: "Social networks",
      description: "Find my writing and projects on these platforms.",
    },
  },

  pages: {
    /** Shared labels for the CMS-driven editorial pages. */
    editorial: {
      timeline: "Journey",
      gallery: "Images",
      empty:
        "This page has no content yet. It is filled in from the dashboard, under Pages.",
    },
    about: {
      eyebrow: "About",
      title: "My path",
      description:
        "From agronomy to business analytics — one thread: understanding systems and equipping decisions.",
      metaTitle: "About",
      metaDescription:
        "Agricultural engineer specialised in economics with an MBA in business analytics: research, data analysis, project management and strategy, from Haiti to Quebec.",
      sections: {
        introduction: "Introduction",
        agronome: "Agricultural engineering degree",
        economie: "Specialisation in economics",
        projet: "Project management",
        suivi: "Monitoring and evaluation",
        recherche: "Research",
        donnees: "Data analysis",
        mba: "MBA in business analytics",
        strategie: "Strategy",
        efficacite: "Efficiency and continuous improvement",
        parcours: "Journey: Haiti → Quebec",
        experiences: "Professional experience",
        valeurs: "Values",
        mentorat: "Mentorship and influences",
      },
    },

    projects: {
      eyebrow: "Portfolio",
      title: "Selected work",
      description:
        "A selection of projects: analysis, visualisation, automation and support for organisations.",
      metaTitle: "Portfolio",
      metaDescription:
        "Data analysis projects, dashboards, automation tools and project management assignments delivered for organisations.",
      filters: "Filters",
      filtersHint: "Filter by category, technology and year.",
      categories: "Categories",
      technologies: "Technologies",
      year: "Year",
      featured: "Featured projects",
      featuredHint: "The most representative work.",
      all: "All projects",
      allHint:
        "Each project has a detailed page: context, approach, results, technologies and links.",
      emptyFeatured: "No featured project yet.",
      empty: "No published projects yet.",
      detail: {
        eyebrow: "Project",
        fallbackDescription: "Detailed project page.",
        sections: {
          presentation: "Overview",
          probleme: "Problem",
          methode: "Methodology",
          resultats: "Results",
          lecons: "Lessons learned",
          galerie: "Gallery",
          stack: "Technologies and categories",
          client: "Client",
          role: "Role",
          lien: "View the project",
          related: "Related work",
          previous: "Previous project",
          next: "Next project",
          pagination: "Project navigation",
        },
      },
    },

    datakle: {
      eyebrow: "Practice",
      title: "Datakle",
      description: "Making data accessible, understandable and useful to organisations.",
      metaTitle: "Datakle",
      metaDescription:
        "Datakle: democratising data. Mission, vision, services, values and projects serving organisations and the development of Haiti.",
      seeServices: "See the services",
      collaborate: "Let's work together",
      collaborateBody: "Would you like to work with Datakle or propose a partnership?",
      collaborateCta: "Get in touch",
      sections: {
        presentation: "Overview",
        mission: "Mission",
        vision: "Vision",
        services: "Services",
        valeurs: "Values",
        projets: "Projects",
        haiti: "A vision for Haiti",
        collaboration: "Collaboration",
      },
    },

    services: {
      eyebrow: "Datakle",
      title: "Services",
      description:
        "Offerings designed for organisations that want to structure, understand and use their data.",
      metaTitle: "Datakle services",
      metaDescription:
        "Support in data analysis, business intelligence, dashboards, automation, training and monitoring and evaluation.",
      catalogue: "Service catalogue",
      catalogueHint: "Each service has a detailed page: scope, deliverables and process.",
      empty: "No published services yet.",
      detail: {
        eyebrow: "Datakle service",
        fallbackDescription: "Detailed service page.",
        sections: {
          presentation: "Overview",
          contenu: "What the service includes",
          livrables: "Deliverables",
        },
      },
    },

    blog: {
      eyebrow: "Blog",
      title: "Articles",
      description: "Field notes, methods and reflections on data and project management.",
      metaTitle: "Blog",
      metaDescription:
        "Articles and analysis on data analysis, business intelligence, project management, monitoring and evaluation, and research.",
      featured: "Featured articles",
      recent: "Recent articles",
      categories: "Categories",
      tags: "Tags",
      emptyFeatured: "No featured article yet.",
      empty: "No published articles yet.",
      emptyCategories: "No categories available.",
      emptyTags: "No tags available.",
      article: {
        eyebrow: "Article",
        fallbackDescription: "Article page.",
        content: "Content",
        taxonomies: "Categories and tags",
        related: "Related articles",
      },
      category: {
        eyebrow: "Category",
        description: "Every article in this category.",
        empty: "No article in this category yet.",
      },
      tag: {
        eyebrow: "Tag",
        description: "Every article with this tag.",
        empty: "No article with this tag yet.",
      },
    },

    engagement: {
      eyebrow: "Commitment",
      title: "Social commitment",
      description: "Putting skills and data at the service of communities.",
      metaTitle: "Social commitment",
      metaDescription:
        "Development of Haiti, education, mentorship, data democratisation and community initiatives.",
      sections: {
        pourquoi: "Why I am involved",
        haiti: "Development of Haiti",
        education: "Education",
        mentorat: "Mentorship",
        democratisation: "Democratising data",
        initiatives: "Community initiatives",
        valeurs: "Human values",
      },
      galleryHint: "Scroll to see the work on the ground",
    },

    cv: {
      eyebrow: "Background",
      title: "Résumé",
      description: "A structured overview of education, experience and skills.",
      metaTitle: "Résumé",
      metaDescription:
        "Profile, education, professional experience, skills, certifications and projects. Résumé available as a PDF.",
      sections: {
        profil: "Profile",
        formation: "Education",
        experiences: "Professional experience",
        competences: "Skills",
        certifications: "Certifications",
        projets: "Projects",
      },
    },

    research: {
      eyebrow: "Research",
      title: "Research work",
      description: "Methods, publications and studies in agronomy, economics and data analysis.",
      metaTitle: "Research",
      metaDescription:
        "Research work, thesis, publications, studies, methodologies, documents and conferences.",
      sections: {
        travaux: "Research work",
        memoire: "Thesis",
        publications: "Publications",
        etudes: "Studies",
        methodologies: "Methodologies",
        documents: "Documents",
        conferences: "Conferences",
      },
    },

    skills: {
      eyebrow: "Expertise",
      title: "Skills",
      description: "The areas I work in, from raw data to decision.",
      metaTitle: "Skills",
      metaDescription:
        "Data analytics, business intelligence, visualisation, Excel/VBA, SQL, Python, project management, monitoring and evaluation, research and strategy.",
      categories: "Categories",
      todo: "Details will be added to this entry.",
      explore: "Explore by skill",
      explorePlaceholder: "Pick skills…",
    },

    contact: {
      eyebrow: "Contact",
      title: "Get in touch",
      description: "A project, a question or an idea to explore? Writing to me is the simplest way.",
      metaTitle: "Contact",
      metaDescription:
        "Write to me about a data project, a collaboration or an advisory assignment in analysis and project management.",
      form: "Form",
      name: "Name",
      organisation: "Organisation",
      email: "Email",
      subject: "Subject",
      message: "Message",
      send: "Send",
      optional: "Optional",
      subjectMandate: "Assignment",
      subjectJob: "Employment",
      subjectOther: "Other",
      messagePlaceholder: "What you are trying to decide…",
      otherWays: "Other ways to reach me",
      booking: "Book a meeting",
      bookingHint: "Reserved for a Calendly integration.",
      phone: "Phone",
      basedIn: "Based in",
      agenda: "Calendar",
      sent: "Message sent. Thank you — I reply quickly.",
      error: "Sending failed. Try again or email me directly.",
    },

    links: {
      eyebrow: "Links",
      title: "All my links",
      description: "A single entry point to my profiles, publications and resources.",
      metaTitle: "Links",
      metaDescription: "All my links in one place: LinkedIn, GitHub, YouTube, Medium, Instagram.",
      networks: "Networks",
      networksHint: "My public profiles.",
      networksEmpty: "No public profile is enabled yet.",
      resources: "Site resources",
    },

    legal: {
      eyebrow: "Legal",
      title: "Legal notice",
      description: "This page will be completed with the final legal information.",
      metaTitle: "Legal notice",
      metaDescription: "Site publisher, hosting, intellectual property and liability.",
      sections: {
        editeur: "Site publisher",
        hebergement: "Hosting",
        propriete: "Intellectual property",
        responsabilite: "Limitation of liability",
        contact: "Contact",
      },
    },

    privacy: {
      eyebrow: "Legal",
      title: "Privacy policy",
      description: "This page will be completed once the site's data processing is defined.",
      metaTitle: "Privacy policy",
      metaDescription:
        "Data collected, purposes, retention period, cookies and the rights of data subjects.",
      sections: {
        donnees: "Data collected",
        finalites: "Purposes of processing",
        conservation: "Retention period",
        cookies: "Cookies and analytics",
        partage: "Data sharing",
        droits: "Your rights",
        contact: "Contact",
      },
    },
  },
} satisfies Dictionary;
