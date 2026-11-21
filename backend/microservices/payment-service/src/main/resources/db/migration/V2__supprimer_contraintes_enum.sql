-- La validité du statut est garantie par l'application ; on retire la contrainte CHECK
-- que Hibernate posait sur cette colonne, si elle existe.

ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
