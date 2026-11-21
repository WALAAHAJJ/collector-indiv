-- Schéma initial du service de paiement.

CREATE TABLE payments (
    id             uuid          NOT NULL PRIMARY KEY,
    user_id        uuid          NOT NULL,
    amount         numeric(10,2) NOT NULL,
    last4          varchar(4)    NOT NULL,
    status         varchar(20)   NOT NULL,
    decline_reason varchar(255),
    created_at     timestamp(6) with time zone NOT NULL,
    refunded_at    timestamp(6) with time zone
);

CREATE INDEX idx_payments_user ON payments (user_id);
