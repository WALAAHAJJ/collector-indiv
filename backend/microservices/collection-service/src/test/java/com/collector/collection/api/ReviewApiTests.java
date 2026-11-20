package com.collector.collection.api;

import com.collector.collection.repository.CategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.UUID;

import static com.collector.collection.api.PurchaseFlowSupport.user;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Avis : l'acheteur note le vendeur une fois la commande reçue, la réputation du vendeur est publique. */
@SpringBootTest
@AutoConfigureMockMvc
class ReviewApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoryRepository categoryRepository;

    private final UUID seller = UUID.randomUUID();
    private final UUID buyer = UUID.randomUUID();
    private PurchaseFlowSupport flow;

    @BeforeEach
    void setUp() {
        flow = new PurchaseFlowSupport(mockMvc, categoryRepository);
    }

    private String deliveredOrder(UUID sellerId, UUID buyerId, String name) throws Exception {
        String orderId = flow.sell(sellerId, buyerId, name);

        mockMvc.perform(post("/api/orders/" + orderId + "/ship").with(user(sellerId))).andExpect(status().isOk());
        mockMvc.perform(post("/api/orders/" + orderId + "/deliver").with(user(buyerId))).andExpect(status().isOk());

        return orderId;
    }

    private ResultActions review(UUID who, String orderId, String json)
            throws Exception {
        return mockMvc.perform(post("/api/orders/" + orderId + "/review")
                .with(user(who))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    @Test
    void buyerReviewsTheSellerAfterTheDelivery() throws Exception {
        String orderId = deliveredOrder(seller, buyer, "Montre");

        review(buyer, orderId, "{\"rating\":5,\"comment\":\"Parfait, merci !\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rating").value(5))
                .andExpect(jsonPath("$.comment").value("Parfait, merci !"))
                .andExpect(jsonPath("$.orderId").value(orderId))
                .andExpect(jsonPath("$.sellerId").value(seller.toString()))
                .andExpect(jsonPath("$.buyerId").value(buyer.toString()));
    }

    @Test
    void theCommentIsOptional() throws Exception {
        String orderId = deliveredOrder(seller, buyer, "Montre");

        review(buyer, orderId, "{\"rating\":3}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.comment").value(nullValue()));
    }

    @Test
    void cannotReviewBeforeTheDelivery() throws Exception {
        String paid = flow.sell(seller, buyer, "Montre");

        review(buyer, paid, "{\"rating\":5}").andExpect(status().isConflict());

        mockMvc.perform(post("/api/orders/" + paid + "/ship").with(user(seller))).andExpect(status().isOk());

        review(buyer, paid, "{\"rating\":5}").andExpect(status().isConflict());
    }

    @Test
    void cannotReviewTwice() throws Exception {
        String orderId = deliveredOrder(seller, buyer, "Montre");
        review(buyer, orderId, "{\"rating\":5}").andExpect(status().isCreated());

        review(buyer, orderId, "{\"rating\":1}").andExpect(status().isConflict());
    }

    @Test
    void theSellerCannotReviewThemselves() throws Exception {
        String orderId = deliveredOrder(seller, buyer, "Montre");

        review(seller, orderId, "{\"rating\":5}").andExpect(status().isForbidden());
    }

    @Test
    void aStrangerDoesNotEvenSeeTheOrder() throws Exception {
        String orderId = deliveredOrder(seller, buyer, "Montre");

        review(UUID.randomUUID(), orderId, "{\"rating\":5}").andExpect(status().isNotFound());
    }

    @Test
    void rejectsAnInvalidRatingOrComment() throws Exception {
        String orderId = deliveredOrder(seller, buyer, "Montre");

        review(buyer, orderId, "{\"rating\":0}").andExpect(status().isBadRequest());
        review(buyer, orderId, "{\"rating\":6}").andExpect(status().isBadRequest());
        review(buyer, orderId, "{}").andExpect(status().isBadRequest());
        review(buyer, orderId, "{\"rating\":4,\"comment\":\"" + "a".repeat(501) + "\"}")
                .andExpect(status().isBadRequest());
    }

    @Test
    void requiresAuthenticationToReview() throws Exception {
        mockMvc.perform(post("/api/orders/" + UUID.randomUUID() + "/review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void theSellerReputationIsPublicWithAnAverage() throws Exception {
        UUID otherBuyer = UUID.randomUUID();
        review(buyer, deliveredOrder(seller, buyer, "Montre"), "{\"rating\":5}").andExpect(status().isCreated());
        review(otherBuyer, deliveredOrder(seller, otherBuyer, "Bague"), "{\"rating\":4,\"comment\":\"Bien\"}")
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/sellers/" + seller + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sellerId").value(seller.toString()))
                .andExpect(jsonPath("$.average").value(4.5))
                .andExpect(jsonPath("$.count").value(2))
                .andExpect(jsonPath("$.reviews", hasSize(2)))
                .andExpect(jsonPath("$.reviews[0].comment").value("Bien"));
    }

    @Test
    void aSellerWithoutReviewHasNoAverage() throws Exception {
        mockMvc.perform(get("/api/sellers/" + UUID.randomUUID() + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.average").value(nullValue()))
                .andExpect(jsonPath("$.count").value(0))
                .andExpect(jsonPath("$.reviews", hasSize(0)));
    }

    @Test
    void theBuyerSeesTheReviewsTheyWrote() throws Exception {
        String orderId = deliveredOrder(seller, buyer, "Montre");
        review(buyer, orderId, "{\"rating\":2}").andExpect(status().isCreated());

        mockMvc.perform(get("/api/reviews/mine").with(user(buyer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].orderId").value(orderId));

        mockMvc.perform(get("/api/reviews/mine").with(user(UUID.randomUUID())))
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
