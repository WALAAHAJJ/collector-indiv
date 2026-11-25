import { useLanguage } from "./i18n";
import { formatRating } from "./reviewsApi";

type StarsProps = Readonly<{ value: number }>;

/** Note de 0 à 5 en étoiles ; le texte alternatif donne la valeur exacte aux lecteurs d'écran. */
export default function Stars({ value }: StarsProps) {
  const { t } = useLanguage();
  const filled = Math.min(5, Math.max(0, Math.round(value)));

  return (
    <span className="stars" role="img" aria-label={t("starsLabel", { value: formatRating(value) })}>
      {"★".repeat(filled)}
      {"☆".repeat(5 - filled)}
    </span>
  );
}
