import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminCategories from "../src/AdminCategories";
import AdminOrders from "../src/AdminOrders";
import AdminPanel from "../src/AdminPanel";
import InfoPage from "../src/InfoPage";
import NotificationBell from "../src/NotificationBell";
import { clearToken, setToken } from "../src/auth";
import { setLanguage } from "../src/i18n";
import { infoContent } from "../src/infoPages";
import { INFO_PAGES } from "../src/route";
import { approvedListing, defaultCategories, jsonResponse, mockFetch } from "./helpers";

beforeEach(() => setToken("token"));

afterEach(() => {
  setLanguage("fr");
  vi.unstubAllGlobals();
  clearToken();
});

describe("traduction de l'administration, des notifications et des pages d'info", () => {
  it("affiche le back-office en anglais", async () => {
    mockFetch(() => jsonResponse([{ ...approvedListing, status: "PENDING_REVIEW" }]));
    setLanguage("en");
    render(<AdminPanel categories={defaultCategories} onCategoriesChange={vi.fn()} onClose={vi.fn()} />);

    expect(await screen.findByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Administration" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pending" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(screen.getByText("Awaiting review")).toBeInTheDocument();
  });

  it("affiche les catégories et les commandes de l'administration en anglais", async () => {
    mockFetch(() => jsonResponse([]));
    setLanguage("en");
    render(
      <>
        <AdminCategories categories={defaultCategories} onChange={vi.fn()} />
        <AdminOrders />
      </>,
    );

    expect(screen.getByRole("button", { name: "Add the category" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Antique book" })).toBeInTheDocument();
    expect(await screen.findByText("No order at the moment.")).toBeInTheDocument();
  });

  it("affiche la cloche de notifications en anglais", async () => {
    mockFetch((url) => (url.endsWith("/unread-count") ? jsonResponse({ count: 2 }) : jsonResponse([])));
    setLanguage("en");
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(await screen.findByRole("button", { name: "Notifications, 2 unread" }));

    expect(await screen.findByText("No notification at the moment.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeInTheDocument();
  });

  it("affiche les pages d'info en anglais, avec les mêmes sections qu'en français", () => {
    setLanguage("en");
    render(<InfoPage slug="faq" />);

    expect(screen.getByRole("heading", { name: "Frequently asked questions" })).toBeInTheDocument();
    expect(screen.getByText("Is the payment real?")).toBeInTheDocument();

    for (const slug of INFO_PAGES) {
      const french = infoContent(slug, "fr");
      const english = infoContent(slug, "en");

      expect(english.sections).toHaveLength(french.sections.length);
      expect(english.sections.map((section) => section.items?.length ?? 0)).toEqual(
        french.sections.map((section) => section.items?.length ?? 0),
      );
    }
  });
});
