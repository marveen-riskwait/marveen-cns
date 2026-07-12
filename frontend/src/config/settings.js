// Curated site settings, grouped for the admin screen. The backend store is a
// free-form key/value table (app/models/setting.py); this descriptor gives the
// known keys a label, a field type and a group/visibility so the UI stays
// declarative. Add a key here to expose it in the Paramètres screen.
//
// field.type reuses FieldInput: text | textarea | media | bool | number | select | color

export const SETTINGS_GROUPS = [
  {
    title: "Général", icon: "bi-sliders",
    fields: [
      { key: "site_name", label: "Nom du site", type: "text", group: "general", public: true },
      { key: "site_tagline", label: "Slogan", type: "text", group: "general", public: true },
      { key: "site_logo", label: "Logo", type: "media", group: "general", public: true },
      { key: "site_favicon", label: "Favicon", type: "media", group: "general", public: true },
      { key: "primary_color", label: "Couleur principale", type: "color", group: "general", public: true },
    ],
  },
  {
    title: "Coordonnées", icon: "bi-geo-alt",
    fields: [
      { key: "contact_email", label: "Email de contact", type: "text", group: "contact", public: true },
      { key: "contact_phone", label: "Téléphone", type: "text", group: "contact", public: true },
      { key: "contact_address", label: "Adresse", type: "textarea", group: "contact", public: true },
    ],
  },
  {
    title: "Réseaux sociaux", icon: "bi-share",
    fields: [
      { key: "social_facebook", label: "Facebook", type: "text", group: "social", public: true },
      { key: "social_instagram", label: "Instagram", type: "text", group: "social", public: true },
      { key: "social_linkedin", label: "LinkedIn", type: "text", group: "social", public: true },
      { key: "social_youtube", label: "YouTube", type: "text", group: "social", public: true },
    ],
  },
  {
    title: "Référencement & analytics", icon: "bi-graph-up",
    fields: [
      { key: "default_meta_description", label: "Description SEO par défaut", type: "textarea", group: "seo", public: true },
      { key: "analytics_id", label: "ID Analytics (GA4)", type: "text", group: "seo", public: false },
      { key: "maintenance_mode", label: "Mode maintenance", type: "bool", group: "system", public: true },
    ],
  },
];

// Flat list of every declared field (for load/save iteration).
export const SETTINGS_FIELDS = SETTINGS_GROUPS.flatMap((g) => g.fields);
