package com.collector.collection.api;

import com.collector.collection.domain.ListingStatus;
import com.collector.collection.events.RecordingPublisherConfig;
import com.collector.collection.events.SaleEvent;
import com.collector.collection.payment.FakePaymentGateway;
import com.collector.collection.repository.CategoryRepository;
import com.collector.collection.repository.CollectibleRepository;
import com.collector.collection.repository.OrderRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.event.EventListener;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Le paiement est dans un autre service : si l'achat échoue après le débit, il faut rembourser. */
@SpringBootTest
@AutoConfigureMockMvc
@Import({RecordingPublisherConfig.class, PaymentCompensationTests.ExplodingSale.class})
class PaymentCompensationTests {

    /** Fait échouer l'achat des annonces nommées « BOOM… » juste après le paiement. */
    @TestConfiguration
    static class ExplodingSale {
        @Bean
        SaleBomb saleBomb() {
            return new SaleBomb();
        }
    }

    static class SaleBomb {
        @EventListener
        void on(SaleEvent event) {
            if (event.listingName().startsWith("BOOM")) {
                throw new IllegalStateException("panne simulée après le paiement");
            }
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private CollectibleRepository collectibleRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private FakePaymentGateway payments;

    private final UUID seller = UUID.randomUUID();
    private final UUID buyer = UUID.randomUUID();
    private PurchaseFlowSupport flow;

    @BeforeEach
    void setUp() {
        payments.setDown(false);
        payments.charged().clear();
        payments.refunded().clear();
        flow = new PurchaseFlowSupport(mockMvc, categoryRepository);
    }

    @AfterEach
    void restore() {
        payments.setDown(false);
    }

    @Test
    void anOrderKeepsTheReferenceOfItsPayment() throws Exception {
        String listingId = flow.createListing(seller, "Pièce payée");

        String orderId = flow.buy(buyer, listingId);

        assertEquals(1, payments.charged().size());
        assertEquals(payments.charged().get(0),
                orderRepository.findById(UUID.fromString(orderId)).orElseThrow().getPaymentId());
        assertTrue(payments.refunded().isEmpty());
    }

    @Test
    void aFailureAfterTheChargeRefundsThePayment() throws Exception {
        String listingId = flow.createListing(seller, "BOOM pièce fragile");

        assertThrows(Exception.class, () -> purchase(listingId));

        assertEquals(1, payments.charged().size());
        assertEquals(payments.charged(), payments.refunded());
        // La transaction a été annulée : l'annonce est toujours en vente.
        assertStillForSale(listingId);
    }

    @Test
    void aDownPaymentServiceAnswers503AndChangesNothing() throws Exception {
        String listingId = flow.createListing(seller, "Pièce en attente");
        payments.setDown(true);

        purchaseResult(listingId).andExpect(status().isServiceUnavailable());

        assertTrue(payments.charged().isEmpty());
        assertTrue(payments.refunded().isEmpty());
        assertStillForSale(listingId);
    }

    @Test
    void aDeclinedCardIsNotRefundedBecauseNothingWasCharged() throws Exception {
        String listingId = flow.createListing(seller, "Pièce refusée");

        mockMvc.perform(post("/api/orders")
                        .with(PurchaseFlowSupport.user(buyer))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"listingId":"%s","cardNumber":"4000 0000 0000 0002","cardHolder":"Walaa Test",
                                 "expiry":"12/40","cvc":"123"}
                                """.formatted(listingId)))
                .andExpect(status().isPaymentRequired());

        assertTrue(payments.charged().isEmpty());
        assertTrue(payments.refunded().isEmpty());
    }

    private void assertStillForSale(String listingId) {
        assertEquals(ListingStatus.APPROVED,
                collectibleRepository.findById(UUID.fromString(listingId)).orElseThrow().getStatus());
    }

    private void purchase(String listingId) throws Exception {
        purchaseResult(listingId);
    }

    private org.springframework.test.web.servlet.ResultActions purchaseResult(String listingId) throws Exception {
        return mockMvc.perform(post("/api/orders")
                .with(PurchaseFlowSupport.user(buyer))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"listingId":"%s","cardNumber":"4242 4242 4242 4242","cardHolder":"Walaa Test",
                         "expiry":"12/40","cvc":"123"}
                        """.formatted(listingId)));
    }
}
