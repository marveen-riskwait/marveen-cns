import { notFound } from "next/navigation";

import { PageView } from "../../components/PageView";
import { getPage, getSettings } from "../../lib/api";
import { pageMetadata } from "../../lib/seo";

// Catch-all public route: /a, /a/b … resolve to a page by its slug.
const toSlug = (parts) => (Array.isArray(parts) ? parts.join("/") : parts);

export async function generateMetadata({ params }) {
  const [page, settings] = await Promise.all([getPage(toSlug(params.slug)), getSettings()]);
  if (!page) return {};
  return pageMetadata(page, settings);
}

export default async function CatchAllPage({ params }) {
  const [page, settings] = await Promise.all([getPage(toSlug(params.slug)), getSettings()]);
  if (!page) notFound();
  return <PageView page={page} settings={settings} />;
}
