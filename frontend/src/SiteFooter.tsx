import { INFO_PAGE_CONTENT } from "./infoPages";
import { INFO_PAGES, infoHref } from "./route";

export default function SiteFooter() {
  return (
    <footer>
      <div className="footer-brand">
        <span className="footer-logo">
          collector<span className="brand-dot">.</span>
        </span>
        <span className="footer-tagline">Les belles collections se partagent.</span>
      </div>

      <nav className="footer-links" aria-label="Informations du site">
        <a href="#catalogue">Catalogue</a>
        {INFO_PAGES.map((slug) => (
          <a key={slug} href={infoHref(slug)}>
            {INFO_PAGE_CONTENT[slug].label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
