import { vi } from "vitest";

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

export function mockFetch(handler: Handler) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init)),
  );

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

export const ownerId = "11111111-1111-4111-8111-111111111111";
export const listingId = "22222222-2222-4222-8222-222222222222";

export const approvedListing = {
  id: listingId,
  ownerId,
  name: "Lot de timbres",
  category: "Timbres",
  description: "Série ancienne",
  price: 18.5,
  shippingCost: 2.5,
  condition: "GOOD",
  status: "APPROVED",
  moderationReason: null,
};
