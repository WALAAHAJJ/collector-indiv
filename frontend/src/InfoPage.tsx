import { useEffect } from "react";
import { useLanguage } from "./i18n";
import { infoContent, type InfoSection } from "./infoPages";
import type { InfoPageSlug } from "./route";

type InfoPageProps = Readonly<{ slug: InfoPageSlug }>;

function Items({ section }: Readonly<{ section: InfoSection }>) {
  if (!section.items) return null;

  return (
    <ol className="info-steps">
      {section.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}

function Paragraphs({ section }: Readonly<{ section: InfoSection }>) {
  return (
    <>
      {section.text?.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </>
  );
}

export default function InfoPage({ slug }: InfoPageProps) {
  const { language, t } = useLanguage();
  const page = infoContent(slug, language);

  useEffect(() => {
    const previousTitle = document.title;

    window.scrollTo({ top: 0 });
    document.title = `${page.title} – Collector`;

    return () => {
      document.title = previousTitle;
    };
  }, [page.title]);

  return (
    <article className="info-page">
      <a className="back-link" href="#catalogue">
        {t("backToCatalogue")}
      </a>

      <header className="info-header">
        <span className="eyebrow">{page.eyebrow}</span>
        <h1>{page.title}</h1>
        <p className="info-intro">{page.intro}</p>
      </header>

      {page.sections.map((section) =>
        page.layout === "faq" ? (
          <details className="info-question" key={section.title}>
            <summary>{section.title}</summary>
            <Paragraphs section={section} />
          </details>
        ) : (
          <section className="info-section" key={section.title}>
            <h2>{section.title}</h2>
            <Paragraphs section={section} />
            <Items section={section} />
          </section>
        ),
      )}
    </article>
  );
}
