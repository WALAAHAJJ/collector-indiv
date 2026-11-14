package com.collector.notification.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

/** Une notification destinée à un utilisateur ; elle reste « non lue » tant que readAt est vide. */
@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Column(nullable = false, length = 500)
    private String message;

    private UUID listingId;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant readAt;

    protected Notification() {
    }

    public Notification(UUID userId, NotificationType type, String message, UUID listingId, Instant createdAt) {
        this.userId = userId;
        this.type = type;
        this.message = message;
        this.listingId = listingId;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getUserId() {
        return userId;
    }

    public NotificationType getType() {
        return type;
    }

    public String getMessage() {
        return message;
    }

    public UUID getListingId() {
        return listingId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getReadAt() {
        return readAt;
    }

    public boolean isRead() {
        return readAt != null;
    }

    /** Marque la notification comme lue ; l'heure de la première lecture est conservée. */
    public void markRead(Instant when) {
        if (readAt == null) {
            readAt = when;
        }
    }
}
