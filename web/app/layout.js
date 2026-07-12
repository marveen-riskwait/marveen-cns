import "./globals.css";

import { Footer, Header } from "../components/Nav";
import { getMenu, getSettings } from "../lib/api";

export async function generateMetadata() {
  const settings = await getSettings();
  const name = settings?.site_name || "Marveen";
  return {
    title: { default: name, template: `%s` },
    description: settings?.default_meta_description || "",
  };
}

export default async function RootLayout({ children }) {
  const [settings, header, footer] = await Promise.all([
    getSettings(), getMenu("header"), getMenu("footer"),
  ]);
  const brand = settings?.primary_color;
  const style = brand ? { "--brand": brand } : undefined;

  return (
    <html lang="fr">
      <body style={style}>
        <Header settings={settings} menu={header} />
        <main>{children}</main>
        <Footer settings={settings} menu={footer} />
      </body>
    </html>
  );
}
