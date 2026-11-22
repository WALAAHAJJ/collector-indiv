package com.collector.payment.api;

import com.collector.payment.domain.Payment;
import com.collector.payment.domain.PaymentStatus;
import com.collector.payment.repository.PaymentRepository;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class PaymentApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PaymentRepository repository;

    private final UUID alice = UUID.randomUUID();
    private final UUID bob = UUID.randomUUID();

    @BeforeEach
    void cleanDatabase() {
        repository.deleteAll();
    }

    private RequestPostProcessor as(UUID userId) {
        return jwt().jwt(token -> token.subject(userId.toString()));
    }

    private static String body(String amount, String card, String expiry) {
        return """
                {"amount": %s, "cardNumber": "%s", "cardHolder": "Walaa Test", "expiry": "%s", "cvc": "123"}
                """.formatted(amount, card, expiry);
    }

    private ResultActions charge(UUID user, String body) throws Exception {
        return mockMvc.perform(post("/api/payments").with(as(user))
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private UUID acceptedPaymentOf(UUID user) throws Exception {
        String json = charge(user, body("23.00", "4242 4242 4242 4242", "12/40"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return UUID.fromString(JsonPath.read(json, "$.id"));
    }

    @Test
    void rejectsRequestsWithoutToken() throws Exception {
        mockMvc.perform(post("/api/payments").contentType(MediaType.APPLICATION_JSON)
                        .content(body("23.00", "4242424242424242", "12/40")))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/payments/" + UUID.randomUUID())).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/payments/" + UUID.randomUUID() + "/refund")).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsATokenWhoseSubjectIsNotAnId() throws Exception {
        mockMvc.perform(post("/api/payments").with(jwt().jwt(token -> token.subject("pas-un-identifiant")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("23.00", "4242424242424242", "12/40")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void acceptsTheTestCardAndKeepsOnlyTheEndOfTheNumber() throws Exception {
        charge(alice, body("23.00", "4242 4242 4242 4242", "12/40"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUCCEEDED"))
                .andExpect(jsonPath("$.amount").value(23.00))
                .andExpect(jsonPath("$.last4").value("4242"))
                .andExpect(jsonPath("$.id").exists())
                .andExpect(content().string(not(containsString("4242 4242"))));

        List<Payment> saved = repository.findAll();
        assertEquals(1, saved.size());
        assertEquals(alice, saved.get(0).getUserId());
        assertEquals(PaymentStatus.SUCCEEDED, saved.get(0).getStatus());
    }

    @Test
    void refusesTheDeclinedTestCardButKeepsATrace() throws Exception {
        charge(alice, body("23.00", "4000 0000 0000 0002", "12/40"))
                .andExpect(status().isPaymentRequired());

        List<Payment> saved = repository.findAll();
        assertEquals(1, saved.size());
        assertEquals(PaymentStatus.DECLINED, saved.get(0).getStatus());
        assertEquals("Paiement refusé par la banque.", saved.get(0).getDeclineReason());
    }

    @Test
    void refusesAnInvalidOrExpiredCard() throws Exception {
        charge(alice, body("23.00", "4242 4242 4242 4241", "12/40")).andExpect(status().isPaymentRequired());
        charge(alice, body("23.00", "4242 4242 4242 4242", "01/20")).andExpect(status().isPaymentRequired());
    }

    @Test
    void rejectsMalformedRequests() throws Exception {
        charge(alice, body("0", "4242424242424242", "12/40")).andExpect(status().isBadRequest());
        charge(alice, body("-5.00", "4242424242424242", "12/40")).andExpect(status().isBadRequest());
        charge(alice, body("23.00", "abcd", "12/40")).andExpect(status().isBadRequest());
        charge(alice, body("23.00", "4242424242424242", "13/40")).andExpect(status().isBadRequest());
        charge(alice, "{}").andExpect(status().isBadRequest());

        assertEquals(0, repository.count());
    }

    @Test
    void theOwnerCanReadAPayment() throws Exception {
        UUID id = acceptedPaymentOf(alice);

        mockMvc.perform(get("/api/payments/" + id).with(as(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id.toString()))
                .andExpect(jsonPath("$.status").value("SUCCEEDED"));
    }

    @Test
    void anotherUserCannotSeeOrRefundAPayment() throws Exception {
        UUID id = acceptedPaymentOf(alice);

        mockMvc.perform(get("/api/payments/" + id).with(as(bob))).andExpect(status().isNotFound());
        mockMvc.perform(post("/api/payments/" + id + "/refund").with(as(bob))).andExpect(status().isNotFound());
        assertEquals(PaymentStatus.SUCCEEDED, repository.findById(id).orElseThrow().getStatus());
    }

    @Test
    void anAdministratorCanRefundSomeoneElsesPayment() throws Exception {
        UUID id = acceptedPaymentOf(alice);

        mockMvc.perform(post("/api/payments/" + id + "/refund")
                        .with(jwt().jwt(token -> token.subject(bob.toString()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REFUNDED"));
    }

    @Test
    void anAcceptedPaymentCanBeRefundedOnlyOnce() throws Exception {
        UUID id = acceptedPaymentOf(alice);

        mockMvc.perform(post("/api/payments/" + id + "/refund").with(as(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REFUNDED"))
                .andExpect(jsonPath("$.refundedAt").exists());

        mockMvc.perform(post("/api/payments/" + id + "/refund").with(as(alice)))
                .andExpect(status().isConflict());
    }

    @Test
    void aDeclinedPaymentCannotBeRefunded() throws Exception {
        Payment declined = repository.save(Payment.declined(
                alice, new BigDecimal("10.00"), "0002", "refus", Instant.parse("2026-06-15T10:00:00Z")));

        mockMvc.perform(post("/api/payments/" + declined.getId() + "/refund").with(as(alice)))
                .andExpect(status().isConflict());
    }

    @Test
    void anUnknownPaymentIsNotFound() throws Exception {
        mockMvc.perform(get("/api/payments/" + UUID.randomUUID()).with(as(alice)))
                .andExpect(status().isNotFound());
    }
}
