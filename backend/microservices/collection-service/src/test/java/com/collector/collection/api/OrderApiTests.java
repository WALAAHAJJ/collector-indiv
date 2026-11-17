package com.collector.collection.api;

import com.collector.collection.domain.Category;
import com.collector.collection.domain.CategoryArt;
import com.collector.collection.repository.CategoryRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OrderApiTests {

    private static final String TEST_CARD = "4242 4242 4242 4242";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoryRepository categoryRepository;

    private final UUID seller = UUID.randomUUID();
    private final UUID buyer = UUID.randomUUID();
    private String category;

    @BeforeEach
    void createCategory() {
        category = "cat" + UUID.randomUUID().toString().substring(0, 8);
        categoryRepository.save(new Category(category, CategoryArt.OTHER));
    }

    @Test
    void buyerPaysAndTheOrderShowsTheFivePercentCommission() throws Exception {
        String listingId = createListing("Pièce ancienne", "Belle pièce de collection");

        String body = purchase(buyer, listingId, TEST_CARD, "12/40")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.listingId").value(listingId))
                .andExpect(jsonPath("$.listingName").value("Pièce ancienne"))
                .andExpect(jsonPath("$.buyerId").value(buyer.toString()))
                .andExpect(jsonPath("$.sellerId").value(seller.toString()))
                .andExpect(jsonPath("$.itemPrice").value(20.00))
                .andExpect(jsonPath("$.shippingCost").value(3.00))
                .andExpect(jsonPath("$.commission").value(1.00))
                .andExpect(jsonPath("$.buyerTotal").value(23.00))
                .andExpect(jsonPath("$.sellerNet").value(22.00))
                .andExpect(jsonPath("$.cardLast4").value("4242"))
                .andReturn().getResponse().getContentAsString();

        assertFalse(body.contains("4242424242424242"), "le numéro complet ne doit jamais être renvoyé");
        assertFalse(body.contains("4242 4242 4242 4242"), "le numéro complet ne doit jamais être renvoyé");
    }

    @Test
    void soldListingLeavesTheCatalogAndShowsAsSoldToItsOwner() throws Exception {
        String listingId = createListing("Montre ancienne", "Belle montre de collection");

        purchase(buyer, listingId, TEST_CARD, "12/40").andExpect(status().isCreated());

        mockMvc.perform(get("/api/collectibles/catalog").param("category", category))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/collectibles/" + listingId).with(user(seller)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SOLD"));
    }

    @Test
    void declinedCardChangesNothingAndTheListingStaysOnSale() throws Exception {
        String listingId = createListing("Carte postale", "Vue de Paris");

        purchase(buyer, listingId, "4000 0000 0000 0002", "12/40")
                .andExpect(status().isPaymentRequired());

        mockMvc.perform(get("/api/collectibles/catalog").param("category", category))
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(get("/api/orders/purchases").with(user(buyer)))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void expiredCardIsDeclined() throws Exception {
        String listingId = createListing("Timbre rare", "Série complète");

        purchase(buyer, listingId, TEST_CARD, "01/20").andExpect(status().isPaymentRequired());
    }

    @Test
    void cannotBuyYourOwnListing() throws Exception {
        String listingId = createListing("Vase ancien", "Vase en porcelaine");

        purchase(seller, listingId, TEST_CARD, "12/40").andExpect(status().isForbidden());
    }

    @Test
    void secondPurchaseOfTheSameListingIsRefused() throws Exception {
        String listingId = createListing("Livre rare", "Édition originale");

        purchase(buyer, listingId, TEST_CARD, "12/40").andExpect(status().isCreated());
        purchase(UUID.randomUUID(), listingId, TEST_CARD, "12/40").andExpect(status().isConflict());
    }

    @Test
    void listingWaitingForReviewCannotBeBought() throws Exception {
        String listingId = createListing("Bague", "Contactez-moi sur vendeur@mail.com");

        purchase(buyer, listingId, TEST_CARD, "12/40").andExpect(status().isNotFound());
    }

    @Test
    void unknownListingIsNotFound() throws Exception {
        purchase(buyer, UUID.randomUUID().toString(), TEST_CARD, "12/40").andExpect(status().isNotFound());
    }

    @Test
    void malformedCardDataIsRejectedBeforeAnyPayment() throws Exception {
        String listingId = createListing("Plaque émaillée", "Plaque publicitaire");

        purchase(buyer, listingId, "abcd", "12/40").andExpect(status().isBadRequest());
        purchase(buyer, listingId, TEST_CARD, "13/40").andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/orders")
                        .with(user(buyer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"listingId":"%s","cardNumber":"%s","cardHolder":"Test","expiry":"12/40","cvc":"1"}
                                """.formatted(listingId, TEST_CARD)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void purchasesAndSalesAreListedForTheRightUser() throws Exception {
        String listingId = createListing("Poupée ancienne", "Poupée de collection");
        purchase(buyer, listingId, TEST_CARD, "12/40").andExpect(status().isCreated());

        mockMvc.perform(get("/api/orders/purchases").with(user(buyer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].listingId").value(listingId));
        mockMvc.perform(get("/api/orders/sales").with(user(seller)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].sellerNet").value(22.00));
        // ni l'acheteur n'a de vente, ni le vendeur d'achat
        mockMvc.perform(get("/api/orders/sales").with(user(buyer)))
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/orders/purchases").with(user(seller)))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void ordersRequireAuthentication() throws Exception {
        mockMvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/orders/purchases")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/orders/sales")).andExpect(status().isUnauthorized());
    }

    private String createListing(String name, String description) throws Exception {
        String body = mockMvc.perform(post("/api/collectibles")
                        .with(user(seller))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "%s",
                                  "category": "%s",
                                  "description": "%s",
                                  "price": 20.00,
                                  "shippingCost": 3.00,
                                  "condition": "GOOD"
                                }
                                """.formatted(name, category, description)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return JsonPath.read(body, "$.id");
    }

    private ResultActions purchase(UUID user, String listingId, String card, String expiry) throws Exception {
        return mockMvc.perform(post("/api/orders")
                .with(user(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "listingId": "%s",
                          "cardNumber": "%s",
                          "cardHolder": "Walaa Test",
                          "expiry": "%s",
                          "cvc": "123"
                        }
                        """.formatted(listingId, card, expiry)));
    }

    private static RequestPostProcessor user(UUID id) {
        return jwt().jwt(token -> token.subject(id.toString()));
    }
}
