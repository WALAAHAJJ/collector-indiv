package com.collector.collection.api;

import com.collector.collection.domain.OrderStatus;
import com.collector.collection.events.OrderStatusEvent;
import com.collector.collection.events.RecordingPublisherConfig;
import com.collector.collection.events.RecordingPublisherConfig.RecordingPublisher;
import com.collector.collection.repository.CategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static com.collector.collection.api.PurchaseFlowSupport.user;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Suivi d'une commande : payée, expédiée par le vendeur, reçue par l'acheteur. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(RecordingPublisherConfig.class)
class OrderTrackingTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private RecordingPublisher publisher;

    private final UUID seller = UUID.randomUUID();
    private final UUID buyer = UUID.randomUUID();
    private PurchaseFlowSupport flow;

    @BeforeEach
    void setUp() {
        flow = new PurchaseFlowSupport(mockMvc, categoryRepository);
    }

    @Test
    void aNewOrderIsPaid() throws Exception {
        flow.sell(seller, buyer, "Montre");

        mockMvc.perform(get("/api/orders/purchases").with(user(buyer)))
                .andExpect(jsonPath("$[0].status").value("PAID"))
                .andExpect(jsonPath("$[0].shippedAt").value(nullValue()))
                .andExpect(jsonPath("$[0].deliveredAt").value(nullValue()));
    }

    @Test
    void sellerShipsTheOrder() throws Exception {
        String orderId = flow.sell(seller, buyer, "Montre");

        mockMvc.perform(post("/api/orders/" + orderId + "/ship").with(user(seller)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SHIPPED"))
                .andExpect(jsonPath("$.shippedAt").value(notNullValue()))
                .andExpect(jsonPath("$.deliveredAt").value(nullValue()));

        mockMvc.perform(get("/api/orders/purchases").with(user(buyer)))
                .andExpect(jsonPath("$[0].status").value("SHIPPED"));
    }

    @Test
    void buyerConfirmsTheDeliveryAfterShipping() throws Exception {
        String orderId = flow.sell(seller, buyer, "Montre");
        mockMvc.perform(post("/api/orders/" + orderId + "/ship").with(user(seller))).andExpect(status().isOk());

        mockMvc.perform(post("/api/orders/" + orderId + "/deliver").with(user(buyer)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"))
                .andExpect(jsonPath("$.deliveredAt").value(notNullValue()));

        mockMvc.perform(get("/api/orders/sales").with(user(seller)))
                .andExpect(jsonPath("$[0].status").value("DELIVERED"));
    }

    @Test
    void buyerCannotShipTheirOwnOrder() throws Exception {
        String orderId = flow.sell(seller, buyer, "Montre");

        mockMvc.perform(post("/api/orders/" + orderId + "/ship").with(user(buyer)))
                .andExpect(status().isForbidden());
    }

    @Test
    void sellerCannotConfirmTheDelivery() throws Exception {
        String orderId = flow.sell(seller, buyer, "Montre");
        mockMvc.perform(post("/api/orders/" + orderId + "/ship").with(user(seller))).andExpect(status().isOk());

        mockMvc.perform(post("/api/orders/" + orderId + "/deliver").with(user(seller)))
                .andExpect(status().isForbidden());
    }

    @Test
    void aStrangerDoesNotEvenSeeTheOrder() throws Exception {
        String orderId = flow.sell(seller, buyer, "Montre");
        UUID stranger = UUID.randomUUID();

        mockMvc.perform(post("/api/orders/" + orderId + "/ship").with(user(stranger)))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/orders/" + orderId + "/deliver").with(user(stranger)))
                .andExpect(status().isNotFound());
    }

    @Test
    void cannotConfirmTheDeliveryBeforeShipping() throws Exception {
        String orderId = flow.sell(seller, buyer, "Montre");

        mockMvc.perform(post("/api/orders/" + orderId + "/deliver").with(user(buyer)))
                .andExpect(status().isConflict());
    }

    @Test
    void cannotShipTwice() throws Exception {
        String orderId = flow.sell(seller, buyer, "Montre");
        mockMvc.perform(post("/api/orders/" + orderId + "/ship").with(user(seller))).andExpect(status().isOk());

        mockMvc.perform(post("/api/orders/" + orderId + "/ship").with(user(seller)))
                .andExpect(status().isConflict());
    }

    @Test
    void cannotConfirmTheDeliveryTwice() throws Exception {
        String orderId = flow.sell(seller, buyer, "Montre");
        mockMvc.perform(post("/api/orders/" + orderId + "/ship").with(user(seller))).andExpect(status().isOk());
        mockMvc.perform(post("/api/orders/" + orderId + "/deliver").with(user(buyer))).andExpect(status().isOk());

        mockMvc.perform(post("/api/orders/" + orderId + "/deliver").with(user(buyer)))
                .andExpect(status().isConflict());
    }

    @Test
    void unknownOrderIsNotFoundAndBadIdIsRejected() throws Exception {
        mockMvc.perform(post("/api/orders/" + UUID.randomUUID() + "/ship").with(user(seller)))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/orders/pas-un-uuid/ship").with(user(seller)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void trackingRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/orders/" + UUID.randomUUID() + "/ship"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/orders/" + UUID.randomUUID() + "/deliver"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shippingAndDeliveryEachPublishOneEvent() throws Exception {
        String listingId = flow.createListing(seller, "Montre");
        String orderId = flow.buy(buyer, listingId);

        mockMvc.perform(post("/api/orders/" + orderId + "/ship").with(user(seller))).andExpect(status().isOk());
        mockMvc.perform(post("/api/orders/" + orderId + "/deliver").with(user(buyer))).andExpect(status().isOk());

        List<OrderStatusEvent> steps = publisher.stepsOf(listingId);
        assertEquals(List.of(OrderStatus.SHIPPED, OrderStatus.DELIVERED),
                steps.stream().map(OrderStatusEvent::status).toList());
        assertEquals(buyer, steps.get(0).buyerId());
        assertEquals(seller, steps.get(0).sellerId());
    }

    @Test
    void aRefusedStepPublishesNothing() throws Exception {
        String listingId = flow.createListing(seller, "Montre");
        String orderId = flow.buy(buyer, listingId);

        mockMvc.perform(post("/api/orders/" + orderId + "/deliver").with(user(buyer)))
                .andExpect(status().isConflict());
        mockMvc.perform(post("/api/orders/" + orderId + "/ship").with(user(buyer)))
                .andExpect(status().isForbidden());

        assertTrue(publisher.stepsOf(listingId).isEmpty());
    }
}
