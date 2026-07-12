import { notFound } from "next/navigation";

import { PageView } from "../components/PageView";
import { getHome, getSettings } from "../lib/api";
import { pageMetadata } from "../lib/seo";

export async function generateMetadata() {
  const [page, settings] = await Promise.all([getHome(), getSettings()]);
  if (!page) return {};
  return pageMetadata(page, settings);
}

export default async function HomePage() {
  const [page, settings] = await Promise.all([getHome(), getSettings()]);
  if (!page) notFound();
  return <PageView page={page} settings={settings} />;
}
