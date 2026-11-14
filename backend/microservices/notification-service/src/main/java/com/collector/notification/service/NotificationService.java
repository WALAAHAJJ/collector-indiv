package com.collector.notification.service;

import com.collector.notification.domain.Notification;
import com.collector.notification.domain.NotificationType;
import com.collector.notification.repository.NotificationRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    /** Le site n'affiche que les plus récentes : inutile de renvoyer tout l'historique. */
    static final int MAX_LISTED = 50;

    private final NotificationRepository repository;
    private final Clock clock;

    public NotificationService(NotificationRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional
    public Notification create(UUID userId, NotificationType type, String message, UUID listingId) {
        return repository.save(new Notification(userId, type, message, listingId, Instant.now(clock)));
    }

    @Transactional(readOnly = true)
    public List<Notification> list(UUID userId) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, MAX_LISTED));
    }

    @Transactional(readOnly = true)
    public long countUnread(UUID userId) {
        return repository.countByUserIdAndReadAtIsNull(userId);
    }

    /** Une notification qui n'appartient pas à l'utilisateur est traitée comme introuvable (404). */
    @Transactional
    public Notification markRead(UUID id, UUID userId) {
        Notification notification = repository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification introuvable"));
        notification.markRead(Instant.now(clock));
        return notification;
    }

    @Transactional
    public int markAllRead(UUID userId) {
        return repository.markAllRead(userId, Instant.now(clock));
    }
}
