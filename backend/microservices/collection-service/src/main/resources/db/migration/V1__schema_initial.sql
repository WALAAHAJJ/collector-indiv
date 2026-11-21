-- Schéma initial du service des annonces (équivalent de ce que Hibernate créait auparavant).

CREATE TABLE categories (
    id   uuid        NOT NULL PRIMARY KEY,
    name varchar(60) NOT NULL UNIQUE,
    art  varchar(20) NOT NULL
);

CREATE TABLE collectibles (
    id                uuid          NOT NULL PRIMARY KEY,
    owner_id          uuid          NOT NULL,
    name              varchar(120)  NOT NULL,
    category          varchar(60)   NOT NULL,
    description       varchar(1000),
    price             numeric(10,2) NOT NULL DEFAULT 0,
    shipping_cost     numeric(10,2) NOT NULL DEFAULT 0,
    item_condition    varchar(20)   NOT NULL DEFAULT 'GOOD',
    status            varchar(20)   NOT NULL DEFAULT 'PENDING_REVIEW',
    moderation_reason varchar(255),
    has_photo         boolean       NOT NULL DEFAULT false
);

CREATE TABLE listing_photos (
    collectible_id uuid        NOT NULL PRIMARY KEY,
    content_type   varchar(20) NOT NULL,
    data           bytea       NOT NULL
);

CREATE TABLE purchase_orders (
    id            uuid          NOT NULL PRIMARY KEY,
    listing_id    uuid          NOT NULL,
    listing_name  varchar(120)  NOT NULL,
    buyer_id      uuid          NOT NULL,
    seller_id     uuid          NOT NULL,
    item_price    numeric(10,2) NOT NULL,
    shipping_cost numeric(10,2) NOT NULL,
    commission    numeric(10,2) NOT NULL,
    buyer_total   numeric(10,2) NOT NULL,
    seller_net    numeric(10,2) NOT NULL,
    card_last4    varchar(4)    NOT NULL,
    payment_id    varchar(40),
    created_at    timestamp(6) with time zone NOT NULL,
    status        varchar(20)   NOT NULL DEFAULT 'PAID',
    shipped_at    timestamp(6) with time zone,
    delivered_at  timestamp(6) with time zone
);

CREATE TABLE reviews (
    id         uuid        NOT NULL PRIMARY KEY,
    order_id   uuid        NOT NULL UNIQUE,
    buyer_id   uuid        NOT NULL,
    seller_id  uuid        NOT NULL,
    rating     integer     NOT NULL,
    body       varchar(500),
    created_at timestamp(6) with time zone NOT NULL
);

CREATE INDEX idx_collectibles_owner ON collectibles (owner_id);
CREATE INDEX idx_collectibles_status ON collectibles (status);
CREATE INDEX idx_orders_buyer ON purchase_orders (buyer_id);
CREATE INDEX idx_orders_seller ON purchase_orders (seller_id);
CREATE INDEX idx_reviews_seller ON reviews (seller_id);
