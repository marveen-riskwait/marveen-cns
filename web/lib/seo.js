import { mediaUrl } from "./api";

// Build Next.js Metadata for a CMS page, merging its SEO block with site defaults.
export function pageMetadata(page, settings) {
  const siteName = settings?.site_name || "Marveen";
  const seo = page?.seo || {};
  // An explicit SEO title is authored in full; only the page title gets the
  // site-name suffix.
  const base = page?.title || siteName;
  const absolute = seo.meta_title
    ? seo.meta_title
    : base === siteName ? siteName : `${base} — ${siteName}`;
  const description = seo.meta_description || settings?.default_meta_description || "";
  const ogImage = seo.og_image ? mediaUrl(seo.og_image) : null;

  return {
    title: { absolute },
    description,
    robots: seo.robots || undefined,
    alternates: seo.canonical ? { canonical: seo.canonical } : undefined,
    openGraph: {
      title: seo.og_title || base,
      description: seo.og_description || description,
      type: "website",
      siteName,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: { card: seo.twitter_card || "summary_large_image" },
  };
}

// JSON-LD structured data for a page.
export function pageJsonLd(page, settings) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page?.title,
    description: page?.seo?.meta_description || settings?.default_meta_description || undefined,
    isPartOf: {
      "@type": "WebSite",
      name: settings?.site_name || "Marveen",
    },
  };
}
