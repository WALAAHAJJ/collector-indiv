-- Hibernate posait des contraintes CHECK sur les colonnes d'énumération : ajouter une valeur
-- (par exemple un nouveau statut) échouait alors sur les bases déjà créées. La validité des
-- valeurs est garantie par l'application ; on retire ces contraintes si elles existent.

ALTER TABLE collectibles DROP CONSTRAINT IF EXISTS collectibles_status_check;
ALTER TABLE collectibles DROP CONSTRAINT IF EXISTS collectibles_item_condition_check;
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_art_check;
