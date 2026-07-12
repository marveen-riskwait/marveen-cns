import { mediaUrl } from "../lib/api";

function MenuLinks({ items }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <ul className="nav-list">
      {list.map((item, i) => (
        <li key={i} className={item.children?.length ? "has-children" : ""}>
          <a href={item.url || "#"}>{item.label}</a>
          {item.children?.length > 0 && (
            <ul className="nav-sub">
              {item.children.map((child, j) => (
                <li key={j}><a href={child.url || "#"}>{child.label}</a></li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

export function Header({ settings, menu }) {
  const logo = settings?.site_logo ? mediaUrl(settings.site_logo) : null;
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a className="brand" href="/">
          {logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logo} alt={settings?.site_name || "Accueil"} className="brand__logo" />
            : <span className="brand__name">{settings?.site_name || "Marveen"}</span>}
        </a>
        <nav className="site-nav"><MenuLinks items={menu?.items} /></nav>
      </div>
    </header>
  );
}

export function Footer({ settings, menu }) {
  const year = new Date().getFullYear();
  const socials = [
    ["site_facebook", "Facebook", settings?.social_facebook],
    ["site_instagram", "Instagram", settings?.social_instagram],
    ["site_linkedin", "LinkedIn", settings?.social_linkedin],
    ["site_youtube", "YouTube", settings?.social_youtube],
  ].filter(([, , url]) => url);
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <div>
          <div className="footer-title">{settings?.site_name || "Marveen"}</div>
          {settings?.contact_email && <div>{settings.contact_email}</div>}
          {settings?.contact_phone && <div>{settings.contact_phone}</div>}
        </div>
        {menu?.items?.length > 0 && (
          <nav className="footer-nav"><MenuLinks items={menu.items} /></nav>
        )}
        {socials.length > 0 && (
          <div className="footer-social">
            {socials.map(([key, label, url]) => (
              <a key={key} href={url} target="_blank" rel="noreferrer">{label}</a>
            ))}
          </div>
        )}
      </div>
      <div className="container site-footer__legal">© {year} {settings?.site_name || "Marveen"}</div>
    </footer>
  );
}
