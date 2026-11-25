import { useLanguage } from "./i18n";
import { INFO_PAGE_CONTENT } from "./infoPages";
import { INFO_PAGES, infoHref } from "./route";

export default function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer>
      <div className="footer-brand">
        <span className="footer-logo">
          collector<span className="brand-dot">.</span>
        </span>
        <span className="footer-tagline">{t("footerTagline")}</span>
      </div>

      <nav className="footer-links" aria-label={t("footerLabel")}>
        <a href="#catalogue">{t("catalogue")}</a>
        {INFO_PAGES.map((slug) => (
          <a key={slug} href={infoHref(slug)}>
            {INFO_PAGE_CONTENT[slug].label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
