import { Blocks } from "./blocks";
import { pageJsonLd } from "../lib/seo";

// Renders a CMS page: optional preview banner, JSON-LD, then its blocks.
export function PageView({ page, settings, preview = false }) {
  const jsonLd = pageJsonLd(page, settings);
  return (
    <>
      {preview && (
        <div className="preview-bar">
          Prévisualisation — cette page n’est pas encore publiée
        </div>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Blocks blocks={page.blocks} />
    </>
  );
}
