package com.collector.collection.api;

import com.collector.collection.domain.Category;
import com.collector.collection.domain.CategoryArt;
import com.collector.collection.events.RecordingPublisherConfig;
import com.collector.collection.events.RecordingPublisherConfig.RecordingPublisher;
import com.collector.collection.events.SaleEvent;
import com.collector.collection.repository.CategoryRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Une vente prévient les autres services ; un achat qui échoue ne prévient personne. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(RecordingPublisherConfig.class)
class SaleEventTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private RecordingPublisher publisher;

    private final UUID seller = UUID.randomUUID();
    private final UUID buyer = UUID.randomUUID();
    private String category;

    @BeforeEach
    void createCategory() {
        category = "cat" + UUID.randomUUID().toString().substring(0, 8);
        categoryRepository.save(new Category(category, CategoryArt.OTHER));
    }

    @Test
    void aSalePublishesOneEventForTheSeller() throws Exception {
        String listingId = createListing("Pièce ancienne");

        purchase(buyer, listingId, "4242 4242 4242 4242").andExpect(status().isCreated());

        List<SaleEvent> sales = publisher.salesOf(listingId);
        assertEquals(1, sales.size());
        SaleEvent sale = sales.get(0);
        assertEquals(seller, sale.sellerId());
        assertEquals("Pièce ancienne", sale.listingName());
        assertEquals(new BigDecimal("22.00"), sale.sellerNet());
        assertNotNull(sale.orderId());
    }

    @Test
    void aDeclinedCardPublishesNothing() throws Exception {
        String listingId = createListing("Carte postale");

        purchase(buyer, listingId, "4000 0000 0000 0002").andExpect(status().isPaymentRequired());

        assertTrue(publisher.salesOf(listingId).isEmpty());
    }

    @Test
    void aRefusedSecondPurchasePublishesNothingMore() throws Exception {
        String listingId = createListing("Livre rare");

        purchase(buyer, listingId, "4242 4242 4242 4242").andExpect(status().isCreated());
        purchase(UUID.randomUUID(), listingId, "4242 4242 4242 4242").andExpect(status().isConflict());

        assertEquals(1, publisher.salesOf(listingId).size());
    }

    private String createListing(String name) throws Exception {
        String body = mockMvc.perform(post("/api/collectibles")
                        .with(user(seller))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","category":"%s","description":"Belle pièce de collection",
                                 "price":20.00,"shippingCost":3.00,"condition":"GOOD"}
                                """.formatted(name, category)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return JsonPath.read(body, "$.id");
    }

    private ResultActions purchase(UUID user, String listingId, String card) throws Exception {
        return mockMvc.perform(post("/api/orders")
                .with(user(user))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"listingId":"%s","cardNumber":"%s","cardHolder":"Walaa Test",
                         "expiry":"12/40","cvc":"123"}
                        """.formatted(listingId, card)));
    }

    private static RequestPostProcessor user(UUID id) {
        return jwt().jwt(token -> token.subject(id.toString()));
    }
}
