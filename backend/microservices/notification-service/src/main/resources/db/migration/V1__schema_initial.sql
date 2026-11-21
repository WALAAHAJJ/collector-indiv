-- Schéma initial du service de notifications.

CREATE TABLE notifications (
    id         uuid         NOT NULL PRIMARY KEY,
    user_id    uuid         NOT NULL,
    type       varchar(30)  NOT NULL,
    message    varchar(500) NOT NULL,
    listing_id uuid,
    created_at timestamp(6) with time zone NOT NULL,
    read_at    timestamp(6) with time zone
);

CREATE INDEX idx_notifications_user ON notifications (user_id);
