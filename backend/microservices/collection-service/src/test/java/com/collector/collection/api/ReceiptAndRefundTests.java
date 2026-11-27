package com.collector.collection.api;

import com.collector.collection.domain.OrderStatus;
import com.collector.collection.events.RecordingPublisherConfig;
import com.collector.collection.events.RecordingPublisherConfig.RecordingPublisher;
import com.collector.collection.payment.FakePaymentGateway;
import com.collector.collection.repository.CategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static com.collector.collection.api.PurchaseFlowSupport.user;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Reçu PDF de l'acheteur et remboursement par l'administration. */
@SpringBootTest
@AutoConfigureMockMvc
@Import(RecordingPublisherConfig.class)
class ReceiptAndRefundTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private FakePaymentGateway payments;

    @Autowired
    private RecordingPublisher publisher;

    private final UUID seller = UUID.randomUUID();
    private final UUID buyer = UUID.randomUUID();
    private PurchaseFlowSupport flow;

    @BeforeEach
    void setUp() {
        flow = new PurchaseFlowSupport(mockMvc, categoryRepository);
    }

    private static RequestPostProcessor admin() {
        return jwt().jwt(token -> token.subject(UUID.randomUUID().toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }

    @Test
    void buyerDownloadsHisReceiptAsPdf() throws Exception {
        String orderId = flow.sell(seller, buyer, "Montre");

        byte[] body = mockMvc.perform(get("/api/orders/" + orderId + "/receipt").with(user(buyer)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        String pdf = new String(body, StandardCharsets.ISO_8859_1);
        assertTrue(pdf.startsWith("%PDF-"));
        assertTrue(pdf.contains("Montre"));
        assertTrue(pdf.contains("23,00"));
    }

    @Test
    void receiptIsHiddenFromEveryoneButTheBuyer() throws Exception {
        String orderId = flow.sell(seller, buyer, "Montre");

        mockMvc.perform(get("/api/orders/" + orderId + "/receipt").with(user(seller)))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/orders/" + orderId + "/receipt").with(user(UUID.randomUUID())))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminRefundsAnOrderAndTheListingIsBackOnSale() throws Exception {
        String listingId = flow.createListing(seller, "Montre");
        String orderId = flow.buy(buyer, listingId);
        int refundsBefore = payments.refunded().size();

        mockMvc.perform(get("/api/collectibles/catalog/" + listingId))
                .andExpect(jsonPath("$.status").value("SOLD"));

        mockMvc.perform(post("/api/admin/orders/" + orderId + "/refund").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REFUNDED"));

        assertEquals(refundsBefore + 1, payments.refunded().size());
        mockMvc.perform(get("/api/collectibles/catalog/" + listingId))
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void refundingAnOrderAnnouncesItToTheBuyer() throws Exception {
        String listingId = flow.createListing(seller, "Montre");
        String orderId = flow.buy(buyer, listingId);

        mockMvc.perform(post("/api/admin/orders/" + orderId + "/refund").with(admin()))
                .andExpect(status().isOk());

        var steps = publisher.stepsOf(listingId);
        assertEquals(1, steps.size());
        assertEquals(OrderStatus.REFUNDED, steps.get(0).status());
        assertEquals(buyer, steps.get(0).buyerId());
    }

    @Test
    void anOrderCannotBeRefundedTwice() throws Exception {
        String orderId = flow.sell(seller, buyer, "Montre");

        mockMvc.perform(post("/api/admin/orders/" + orderId + "/refund").with(admin()))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/admin/orders/" + orderId + "/refund").with(admin()))
                .andExpect(status().isConflict());
    }

    @Test
    void ordinaryUsersCannotRefund() throws Exception {
        String orderId = flow.sell(seller, buyer, "Montre");

        mockMvc.perform(post("/api/admin/orders/" + orderId + "/refund").with(user(buyer)))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminListsAllOrders() throws Exception {
        flow.sell(seller, buyer, "Montre");

        mockMvc.perform(get("/api/admin/orders").with(admin()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].listingName").exists());
    }
}
