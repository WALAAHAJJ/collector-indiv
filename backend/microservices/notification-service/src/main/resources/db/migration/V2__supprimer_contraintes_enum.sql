-- Hibernate posait une contrainte CHECK sur le type de notification : les types ajoutés
-- ensuite (par exemple ORDER_PAID) étaient refusés sur les bases déjà créées.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
