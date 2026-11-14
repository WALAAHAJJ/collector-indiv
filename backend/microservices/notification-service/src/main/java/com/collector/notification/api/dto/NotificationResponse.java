package com.collector.notification.api.dto;

import com.collector.notification.domain.Notification;
import com.collector.notification.domain.NotificationType;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        NotificationType type,
        String message,
        UUID listingId,
        Instant createdAt,
        boolean read
) {

    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getType(),
                notification.getMessage(),
                notification.getListingId(),
                notification.getCreatedAt(),
                notification.isRead()
        );
    }
}
