-- Remboursement d'une commande par l'administration : date du remboursement.

ALTER TABLE purchase_orders ADD COLUMN refunded_at timestamp(6) with time zone;
