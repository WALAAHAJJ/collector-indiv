package com.collector.notification.service;

import com.collector.notification.domain.Notification;
import com.collector.notification.domain.NotificationType;
import com.collector.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
class NotificationServiceTests {

    @Autowired
    private NotificationService service;

    @Autowired
    private NotificationRepository repository;

    private final UUID user = UUID.randomUUID();

    @BeforeEach
    void cleanDatabase() {
        repository.deleteAll();
    }

    @Test
    void createsAnUnreadNotificationWithTheCurrentTime() {
        UUID listing = UUID.randomUUID();

        Notification created = service.create(user, NotificationType.LISTING_REJECTED, "Refusée", listing);

        assertNotNull(created.getId());
        assertNotNull(created.getCreatedAt());
        assertFalse(created.isRead());
        assertEquals(listing, created.getListingId());
        assertEquals(1, service.countUnread(user));
    }

    @Test
    void listsAtMostTheFiftyMostRecent() {
        Instant start = Instant.parse("2026-11-14T08:00:00Z");
        for (int i = 0; i < NotificationService.MAX_LISTED + 5; i++) {
            repository.save(new Notification(
                    user, NotificationType.LISTING_APPROVED, "n" + i, null, start.plusSeconds(i)));
        }

        List<Notification> listed = service.list(user);

        assertEquals(NotificationService.MAX_LISTED, listed.size());
        assertEquals("n" + (NotificationService.MAX_LISTED + 4), listed.get(0).getMessage());
    }

    @Test
    void markReadKeepsTheTimeOfTheFirstRead() {
        Notification created = service.create(user, NotificationType.LISTING_APPROVED, "Ok", null);

        Instant first = service.markRead(created.getId(), user).getReadAt();
        Instant second = service.markRead(created.getId(), user).getReadAt();

        assertNotNull(first);
        assertEquals(first, second);
    }
}
