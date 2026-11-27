import type { Language } from "./i18n";
import { englishInfoPages } from "./infoPagesEn";
import type { InfoPageSlug } from "./route";

export type InfoSection = {
  title: string;
  /** Paragraphes de texte. */
  text?: string[];
  /** Liste d'étapes ou de points, affichée sous le texte. */
  items?: string[];
};

export type InfoPageContent = {
  slug: InfoPageSlug;
  /** Libellé court, utilisé dans la navigation et le pied de page. */
  label: string;
  eyebrow: string;
  title: string;
  intro: string;
  /** « faq » : chaque section est une question que l'on déplie. */
  layout: "sections" | "faq";
  sections: InfoSection[];
};

const howItWorks: InfoPageContent = {
  slug: "comment-ca-marche",
  label: "Comment ça marche",
  eyebrow: "LE MODE D'EMPLOI",
  title: "Comment ça marche",
  intro:
    "Collector met en relation des collectionneurs qui veulent vendre des pièces et d'autres qui cherchent la perle rare. Voici le parcours, de l'annonce à l'avis.",
  layout: "sections",
  sections: [
    {
      title: "Pour acheter",
      items: [
        "Parcourez le catalogue : recherche, catégories, filtres de prix et d'état, tri, favoris. Ouvrez une annonce pour voir sa fiche complète et la réputation du vendeur.",
        "Créez un compte ou connectez-vous, puis cliquez sur « Acheter » : le total est le prix de l'objet plus les frais d'expédition fixés par le vendeur.",
        "Payez par carte. Le paiement est une simulation : aucun argent ne bouge, mais les contrôles d'une vraie carte sont appliqués.",
        "Suivez votre commande dans « Mes commandes » et dans la cloche de notifications : payée, expédiée, reçue.",
        "Dès que le colis est là, confirmez la réception, puis notez le vendeur de 1 à 5 étoiles avec un commentaire facultatif.",
      ],
    },
    {
      title: "Pour vendre",
      items: [
        "Créez un compte, puis « Déposer une annonce » : titre, description, catégorie, état, prix, frais d'expédition et photo.",
        "Votre annonce est relue par un administrateur avant d'apparaître. Vous êtes prévenu dans la cloche, avec le motif si elle est refusée.",
        "Quand elle est vendue, vous recevez une notification avec votre gain net. L'annonce quitte le catalogue.",
        "Expédiez l'objet puis cliquez sur « Marquer comme expédiée » dans « Mes commandes », onglet « Mes ventes ». L'acheteur est prévenu.",
        "À la confirmation de réception, la vente est terminée et l'acheteur peut vous laisser un avis, visible sur toutes vos annonces.",
      ],
    },
    {
      title: "Ce que ça coûte",
      text: [
        "Le site prélève 5 % du prix de l'objet. Les frais d'expédition reviennent entièrement au vendeur.",
        "Exemple : un objet à 20,00 € avec 3,00 € de port. L'acheteur paie 23,00 €, le site garde 1,00 €, le vendeur reçoit 22,00 €.",
      ],
    },
  ],
};

const faq: InfoPageContent = {
  slug: "faq",
  label: "FAQ",
  eyebrow: "VOS QUESTIONS",
  title: "Questions fréquentes",
  intro: "Les réponses aux questions que l'on nous pose le plus. Si la vôtre n'y est pas, écrivez-nous depuis la page Contact.",
  layout: "faq",
  sections: [
    {
      title: "Dois-je avoir un compte pour parcourir le catalogue ?",
      text: ["Non. Le catalogue, les fiches d'annonces et les avis sur les vendeurs sont publics. Un compte est nécessaire pour acheter, vendre et noter."],
    },
    {
      title: "Le paiement est-il réel ?",
      text: [
        "Non, c'est une simulation. La carte de test 4242 4242 4242 4242 est acceptée, la carte 4000 0000 0000 0002 est toujours refusée, et un numéro invalide ou une date dépassée est rejeté.",
        "Les numéros de carte ne sont jamais enregistrés : seule la fin (4 derniers chiffres) apparaît sur la commande.",
      ],
    },
    {
      title: "Pourquoi mon annonce n'apparaît-elle pas tout de suite ?",
      text: ["Chaque annonce est relue par un administrateur. Vous recevez une notification quand elle est approuvée, ou refusée avec un motif, que vous pouvez corriger."],
    },
    {
      title: "Puis-je modifier ou supprimer une annonce ?",
      text: ["Oui, depuis « Mes annonces », tant qu'elle n'est pas vendue. Une annonce vendue ne peut plus être modifiée, supprimée ni remise en vente."],
    },
    {
      title: "Que se passe-t-il si deux personnes achètent le même objet ?",
      text: ["Chaque objet est unique : le premier paiement validé l'emporte, le second reçoit un message d'erreur et n'est pas débité."],
    },
    {
      title: "Pourquoi n'y a-t-il pas de panier ?",
      text: ["Les objets de collection sont des pièces uniques, expédiées chacune par leur vendeur avec ses propres frais. Chaque achat est donc une commande à part."],
    },
    {
      title: "Comment fonctionnent les avis ?",
      text: ["Seul l'acheteur peut noter le vendeur, une seule fois par commande et seulement après avoir confirmé la réception. La note moyenne et les derniers avis apparaissent sur les annonces du vendeur."],
    },
    {
      title: "Mes favoris me suivent-ils sur un autre appareil ?",
      text: ["Non : ils sont enregistrés dans votre navigateur, une liste par compte. Les retrouver ailleurs demanderait de les stocker côté serveur."],
    },
  ],
};

const cgu: InfoPageContent = {
  slug: "cgu",
  label: "Conditions d'utilisation",
  eyebrow: "LES RÈGLES DU JEU",
  title: "Conditions générales d'utilisation",
  intro:
    "Ces conditions décrivent le fonctionnement de Collector : qui peut acheter et vendre, comment se déroule une commande, et les règles à respecter.",
  layout: "sections",
  sections: [
    {
      title: "1. Objet",
      text: ["Le site permet à des particuliers de publier des annonces d'objets de collection, d'en acheter et de s'évaluer mutuellement."],
    },
    {
      title: "2. Compte",
      text: ["L'accès aux fonctions d'achat et de vente demande un compte, géré par un service d'authentification. Vous êtes responsable de la confidentialité de votre mot de passe."],
    },
    {
      title: "3. Annonces et modération",
      text: [
        "Le vendeur décrit honnêtement l'objet, son état et ses frais d'expédition. Toute annonce est relue par un administrateur avant publication et peut être refusée avec un motif.",
        "Une annonce vendue ne peut plus être modifiée ni supprimée.",
      ],
    },
    {
      title: "4. Prix, commission et expédition",
      text: ["Le prix affiché est celui de l'objet. Le site prélève une commission de 5 % de ce prix, et les frais d'expédition reviennent au vendeur. Le total payé par l'acheteur est affiché avant la confirmation."],
    },
    {
      title: "5. Paiement",
      text: ["Le paiement est simulé : aucune somme n'est débitée. Les données de carte ne sont ni enregistrées ni journalisées, seuls les quatre derniers chiffres figurent sur la commande."],
    },
    {
      title: "6. Commande et réception",
      text: ["Une commande passe par trois étapes : payée, expédiée par le vendeur, reçue (confirmée par l'acheteur). Chaque partie est prévenue de l'étape suivante par une notification."],
    },
    {
      title: "7. Avis",
      text: ["Un avis comprend une note de 1 à 5 et un commentaire facultatif de 500 caractères au plus. Il ne peut être déposé que par l'acheteur, une fois par commande, après réception."],
    },
    {
      title: "8. Données personnelles",
      text: ["Le site conserve les informations nécessaires au fonctionnement du service : compte, annonces, commandes, notifications et avis. Les favoris restent dans votre navigateur."],
    },
    {
      title: "9. Responsabilité",
      text: ["Le site met en relation des particuliers et ne garantit pas les objets vendus. Comme il s'agit d'une démonstration, aucune transaction réelle n'a lieu."],
    },
    {
      title: "10. Évolution des conditions",
      text: ["Ces conditions peuvent évoluer avec le site. La version affichée ici fait foi."],
    },
  ],
};

const contact: InfoPageContent = {
  slug: "contact",
  label: "Contact",
  eyebrow: "UNE QUESTION ?",
  title: "Nous contacter",
  intro: "Avant d'écrire, voyez si la réponse se trouve dans la FAQ ou dans « Mes commandes » : beaucoup de questions s'y règlent en deux clics.",
  layout: "sections",
  sections: [
    {
      title: "Pour une demande",
      text: ["Indiquez toujours le titre de l'annonce concernée : cela accélère la réponse."],
    },
    {
      title: "Selon votre question",
      items: [
        "Une commande : « Mes commandes » indique l'étape en cours, et la cloche garde l'historique des notifications.",
        "Une annonce refusée : le motif figure dans la notification que vous avez reçue, et dans « Mes annonces ».",
        "Un colis non reçu : écrivez-nous avec le titre de l'annonce et la date de commande.",
        "Un avis qui vous semble abusif : signalez-le-nous avec le titre de l'annonce.",
      ],
    },
  ],
};

export const INFO_PAGE_CONTENT: Record<InfoPageSlug, InfoPageContent> = {
  "comment-ca-marche": howItWorks,
  faq,
  cgu,
  contact,
};

const ENGLISH_CONTENT = englishInfoPages();

/** Contenu d'une page d'information dans la langue choisie. */
export function infoContent(slug: InfoPageSlug, language: Language): InfoPageContent {
  return (language === "en" ? ENGLISH_CONTENT : INFO_PAGE_CONTENT)[slug];
}
