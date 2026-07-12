import { notFound } from "next/navigation";

import { PageView } from "../../components/PageView";
import { getPreview, getSettings } from "../../lib/api";

// Draft preview: /preview?token=… renders any page via a signed CMS token.
// Never indexed.
export const metadata = { robots: { index: false, follow: false } };

export default async function PreviewPage({ searchParams }) {
  const token = searchParams?.token;
  if (!token) notFound();
  const [page, settings] = await Promise.all([getPreview(token), getSettings()]);
  if (!page) notFound();
  return <PageView page={page} settings={settings} preview />;
}
