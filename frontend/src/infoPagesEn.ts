import type { InfoPageContent } from "./infoPages";
import type { InfoPageSlug } from "./route";

/** Version anglaise des pages d'information ; le français reste la référence (infoPages.ts). */
export function englishInfoPages(): Record<InfoPageSlug, InfoPageContent> {
  return {
    "comment-ca-marche": {
      slug: "comment-ca-marche",
      label: "How it works",
      eyebrow: "THE GUIDE",
      title: "How it works",
      intro:
        "Collector connects collectors who want to sell pieces with others looking for the rare find. Here is the journey, from listing to review.",
      layout: "sections",
      sections: [
        {
          title: "To buy",
          items: [
            "Browse the catalogue: search, categories, price and condition filters, sorting, favourites. Open a listing to see its full page and the seller's reputation.",
            "Create an account or log in, then click “Buy”: the total is the item price plus the shipping cost set by the seller.",
            "Pay by card. The payment is a simulation: no money moves, but the checks of a real card are applied.",
            "Follow your order in “My orders” and in the notification bell: paid, shipped, received.",
            "Once the parcel is there, confirm receipt, then rate the seller from 1 to 5 stars with an optional comment.",
          ],
        },
        {
          title: "To sell",
          items: [
            "Create an account, then “Post a listing”: title, description, category, condition, price, shipping cost and photo.",
            "Your listing is checked automatically before it appears (an administrator validates it above €5,000). You are notified in the bell, with the reason if it is refused.",
            "When it is sold, you receive a notification with your net earnings. The listing leaves the catalogue.",
            "Ship the item then click “Mark as shipped” in “My orders”, “My sales” tab. The buyer is notified.",
            "Once receipt is confirmed, the sale is complete and the buyer can leave you a review, visible on all your listings.",
          ],
        },
        {
          title: "What it costs",
          text: [
            "The site takes 5% of the item price. Shipping costs go entirely to the seller.",
            "Example: an item at €20.00 with €3.00 shipping. The buyer pays €23.00, the site keeps €1.00, the seller receives €22.00.",
          ],
        },
      ],
    },
    faq: {
      slug: "faq",
      label: "FAQ",
      eyebrow: "YOUR QUESTIONS",
      title: "Frequently asked questions",
      intro: "Answers to the questions we are asked most. If yours is not here, write to us from the Contact page.",
      layout: "faq",
      sections: [
        {
          title: "Do I need an account to browse the catalogue?",
          text: ["No. The catalogue, listing pages and seller reviews are public. An account is needed to buy, sell and rate."],
        },
        {
          title: "Is the payment real?",
          text: [
            "No, it is a simulation. The test card 4242 4242 4242 4242 is accepted, card 4000 0000 0000 0002 is always refused, and an invalid number or an expired date is rejected.",
            "Card numbers are never stored: only the end (last 4 digits) appears on the order.",
          ],
        },
        {
          title: "Why does my listing not appear right away?",
          text: ["Every listing is checked automatically, and validated by an administrator above €5,000. You receive a notification when it is approved, or refused with a reason that you can fix."],
        },
        {
          title: "Can I edit or delete a listing?",
          text: ["Yes, from “My listings”, as long as it is not sold. A sold listing can no longer be edited, deleted or put back on sale."],
        },
        {
          title: "What happens if two people buy the same item?",
          text: ["Each item is unique: the first validated payment wins, the second receives an error message and is not charged."],
        },
        {
          title: "Why is there no basket?",
          text: ["Collectibles are unique pieces, each shipped by its seller with its own costs. Each purchase is therefore a separate order."],
        },
        {
          title: "How do reviews work?",
          text: ["Only the buyer can rate the seller, once per order and only after confirming receipt. The average rating and the latest reviews appear on the seller's listings."],
        },
        {
          title: "Do my favourites follow me to another device?",
          text: ["No: they are saved in your browser, one list per account. Finding them elsewhere would require storing them on the server."],
        },
      ],
    },
    cgu: {
      slug: "cgu",
      label: "Terms of use",
      eyebrow: "THE RULES OF THE GAME",
      title: "General terms of use",
      intro:
        "These terms describe how Collector works: who can buy and sell, how an order goes, and the rules to follow.",
      layout: "sections",
      sections: [
        {
          title: "1. Purpose",
          text: ["The site lets individuals publish listings of collectibles, buy them and rate each other."],
        },
        {
          title: "2. Account",
          text: ["Buying and selling require an account, managed by an authentication service. You are responsible for keeping your password confidential."],
        },
        {
          title: "3. Listings and moderation",
          text: [
            "The seller describes the item, its condition and shipping costs honestly. Every listing is checked before publication (by an administrator above €5,000) and may be refused with a reason.",
            "A sold listing can no longer be edited or deleted.",
          ],
        },
        {
          title: "4. Price, commission and shipping",
          text: ["The displayed price is the price of the item. The site takes a 5% commission on it, and shipping costs go to the seller. The total paid by the buyer is shown before confirmation."],
        },
        {
          title: "5. Payment",
          text: ["The payment is simulated: no amount is charged. Card data is neither stored nor logged, only the last four digits appear on the order."],
        },
        {
          title: "6. Order and receipt",
          text: ["An order goes through three steps: paid, shipped by the seller, received (confirmed by the buyer). Each party is notified of the next step."],
        },
        {
          title: "7. Reviews",
          text: ["A review consists of a rating from 1 to 5 and an optional comment of at most 500 characters. Only the buyer can post it, once per order, after receipt."],
        },
        {
          title: "8. Personal data",
          text: ["The site keeps the information needed to run the service: account, listings, orders, notifications and reviews. Favourites stay in your browser."],
        },
        {
          title: "9. Liability",
          text: ["The site connects individuals and does not guarantee the items sold. As this is a demonstration, no real transaction takes place."],
        },
        {
          title: "10. Changes to the terms",
          text: ["These terms may change with the site. The version displayed here prevails."],
        },
      ],
    },
    contact: {
      slug: "contact",
      label: "Contact",
      eyebrow: "A QUESTION?",
      title: "Contact us",
      intro: "Before writing, check whether the answer is in the FAQ or in “My orders”: many questions are settled there in two clicks.",
      layout: "sections",
      sections: [
        {
          title: "For a request",
          text: ["Always mention the title of the listing concerned: it speeds up the answer."],
        },
        {
          title: "Depending on your question",
          items: [
            "An order: “My orders” shows the current step, and the bell keeps the history of notifications.",
            "A refused listing: the reason is in the notification you received, and in “My listings”.",
            "A parcel not received: write to us with the listing title and the order date.",
            "A review that seems abusive: report it to us with the listing title.",
          ],
        },
      ],
    },
  };
}
