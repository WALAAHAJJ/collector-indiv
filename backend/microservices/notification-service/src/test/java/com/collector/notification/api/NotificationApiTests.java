package com.collector.notification.api;

import com.collector.notification.domain.Notification;
import com.collector.notification.domain.NotificationType;
import com.collector.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class NotificationApiTests {

    private static final Instant NOON = Instant.parse("2026-11-14T12:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private NotificationRepository repository;

    private final UUID alice = UUID.randomUUID();
    private final UUID bob = UUID.randomUUID();

    @BeforeEach
    void cleanDatabase() {
        repository.deleteAll();
    }

    private RequestPostProcessor as(UUID userId) {
        return jwt().jwt(token -> token.subject(userId.toString()));
    }

    private Notification save(UUID userId, String message, Instant createdAt) {
        return repository.save(new Notification(
                userId, NotificationType.LISTING_APPROVED, message, UUID.randomUUID(), createdAt));
    }

    @Test
    void rejectsRequestsWithoutToken() throws Exception {
        mockMvc.perform(get("/api/notifications")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/notifications/unread-count")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/notifications/read-all")).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsTokenWhoseSubjectIsNotAnId() throws Exception {
        mockMvc.perform(get("/api/notifications")
                        .with(jwt().jwt(token -> token.subject("pas-un-identifiant"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void returnsAnEmptyListWhenThereIsNothing() throws Exception {
        mockMvc.perform(get("/api/notifications").with(as(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void listsOnlyMyNotificationsNewestFirst() throws Exception {
        save(alice, "ancienne", NOON.minusSeconds(60));
        save(alice, "récente", NOON);
        save(bob, "celle de Bob", NOON);

        mockMvc.perform(get("/api/notifications").with(as(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].message").value("récente"))
                .andExpect(jsonPath("$[1].message").value("ancienne"))
                .andExpect(jsonPath("$[0].read").value(false))
                .andExpect(jsonPath("$[0].type").value("LISTING_APPROVED"));
    }

    @Test
    void countsOnlyMyUnreadNotifications() throws Exception {
        Notification already = save(alice, "déjà lue", NOON);
        already.markRead(NOON);
        repository.save(already);
        save(alice, "non lue", NOON);
        save(bob, "celle de Bob", NOON);

        mockMvc.perform(get("/api/notifications/unread-count").with(as(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1));
    }

    @Test
    void markingAsReadUpdatesTheNotification() throws Exception {
        Notification notification = save(alice, "à lire", NOON);

        mockMvc.perform(post("/api/notifications/{id}/read", notification.getId()).with(as(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));

        assertTrue(repository.findById(notification.getId()).orElseThrow().isRead());
        mockMvc.perform(get("/api/notifications/unread-count").with(as(alice)))
                .andExpect(jsonPath("$.count").value(0));
    }

    @Test
    void cannotMarkSomeoneElsesNotificationAsRead() throws Exception {
        Notification notification = save(bob, "celle de Bob", NOON);

        mockMvc.perform(post("/api/notifications/{id}/read", notification.getId()).with(as(alice)))
                .andExpect(status().isNotFound());

        assertEquals(false, repository.findById(notification.getId()).orElseThrow().isRead());
    }

    @Test
    void unknownNotificationIsNotFound() throws Exception {
        mockMvc.perform(post("/api/notifications/{id}/read", UUID.randomUUID()).with(as(alice)))
                .andExpect(status().isNotFound());
    }

    @Test
    void markAllReadOnlyTouchesMyNotifications() throws Exception {
        save(alice, "une", NOON);
        save(alice, "deux", NOON);
        save(bob, "celle de Bob", NOON);

        mockMvc.perform(post("/api/notifications/read-all").with(as(alice)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updated").value(2));

        mockMvc.perform(get("/api/notifications/unread-count").with(as(alice)))
                .andExpect(jsonPath("$.count").value(0));
        mockMvc.perform(get("/api/notifications/unread-count").with(as(bob)))
                .andExpect(jsonPath("$.count").value(1));
    }
}
