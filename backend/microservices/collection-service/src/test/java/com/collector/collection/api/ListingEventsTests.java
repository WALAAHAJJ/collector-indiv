package com.collector.collection.api;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.collector.collection.domain.ListingStatus;
import com.collector.collection.events.ListingStatusEvent;
import com.collector.collection.events.RecordingPublisherConfig;
import com.collector.collection.events.RecordingPublisherConfig.RecordingPublisher;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Import(RecordingPublisherConfig.class)
class ListingEventsTests {

    private static final String LISTING = """
            {
              "name": "Lot de timbres",
              "category": "Timbres",
              "description": "%s",
              "price": %s,
              "shippingCost": 2.50,
              "condition": "GOOD"
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private RecordingPublisher publisher;

    @Test
    void publishesApprovedWhenAListingIsPublishedAtOnce() throws Exception {
        UUID owner = UUID.randomUUID();
        String id = create(owner, "Série ancienne", "18.50");

        ListingStatusEvent event = onlyEvent(id);
        assertEquals(ListingStatus.APPROVED, event.status());
        assertEquals(owner, event.ownerId());
        assertEquals("Lot de timbres", event.listingName());
        assertNull(event.reason());
    }

    @Test
    void publishesRejectedWithTheReasonWhenModerationRefuses() throws Exception {
        String id = create(UUID.randomUUID(), "Écrire à vendeur@mail.com", "18.50");

        ListingStatusEvent event = onlyEvent(id);
        assertEquals(ListingStatus.REJECTED, event.status());
        assertTrue(event.reason().contains("coordonnées"));
    }

    @Test
    void publishesPendingReviewForAVeryExpensiveListing() throws Exception {
        String id = create(UUID.randomUUID(), "Pièce unique", "7500.00");

        assertEquals(ListingStatus.PENDING_REVIEW, onlyEvent(id).status());
    }

    @Test
    void publishesApprovedWhenTheAdministratorApproves() throws Exception {
        String id = create(UUID.randomUUID(), "Pièce unique", "7500.00");

        mockMvc.perform(post("/api/admin/collectibles/{id}/approve", id).with(admin()))
                .andExpect(status().isOk());

        var events = publisher.eventsFor(id);
        assertEquals(2, events.size());
        assertEquals(ListingStatus.APPROVED, events.get(1).status());
    }

    @Test
    void publishesRejectedWithTheAdministratorsReason() throws Exception {
        String id = create(UUID.randomUUID(), "Pièce unique", "7500.00");

        mockMvc.perform(post("/api/admin/collectibles/{id}/reject", id)
                        .with(admin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\": \"Photo non conforme\"}"))
                .andExpect(status().isOk());

        var events = publisher.eventsFor(id);
        assertEquals(2, events.size());
        assertEquals(ListingStatus.REJECTED, events.get(1).status());
        assertEquals("Photo non conforme", events.get(1).reason());
    }

    @Test
    void doesNotRepeatAnEventWhenTheStatusStaysTheSame() throws Exception {
        UUID owner = UUID.randomUUID();
        String id = create(owner, "Série ancienne", "18.50");

        mockMvc.perform(put("/api/collectibles/{id}", id)
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LISTING.formatted("Série très ancienne", "20.00")))
                .andExpect(status().isOk());

        assertEquals(1, publisher.eventsFor(id).size());
    }

    @Test
    void publishesWhenAnEditChangesTheStatus() throws Exception {
        UUID owner = UUID.randomUUID();
        String id = create(owner, "Série ancienne", "18.50");

        mockMvc.perform(put("/api/collectibles/{id}", id)
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LISTING.formatted("Écrire à vendeur@mail.com", "18.50")))
                .andExpect(status().isOk());

        var events = publisher.eventsFor(id);
        assertEquals(2, events.size());
        assertEquals(ListingStatus.REJECTED, events.get(1).status());
    }

    @Test
    void publishesNothingWhenTheAdministratorApprovesAnApprovedListing() throws Exception {
        String id = create(UUID.randomUUID(), "Série ancienne", "18.50");

        mockMvc.perform(post("/api/admin/collectibles/{id}/approve", id).with(admin()))
                .andExpect(status().isOk());

        assertEquals(1, publisher.eventsFor(id).size());
    }

    private ListingStatusEvent onlyEvent(String id) {
        var events = publisher.eventsFor(id);
        assertEquals(1, events.size());
        return events.get(0);
    }

    private String create(UUID owner, String description, String price) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/collectibles")
                        .with(user(owner))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LISTING.formatted(description, price)))
                .andExpect(status().isCreated())
                .andReturn();

        Matcher matcher = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"")
                .matcher(created.getResponse().getContentAsString());

        assertTrue(matcher.find(), "La réponse doit contenir l’identifiant de l’annonce");
        return matcher.group(1);
    }

    private RequestPostProcessor user(UUID userId) {
        return jwt().jwt(token -> token.subject(userId.toString()));
    }

    private RequestPostProcessor admin() {
        return jwt()
                .jwt(token -> token.subject(UUID.randomUUID().toString()))
                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"));
    }
}
