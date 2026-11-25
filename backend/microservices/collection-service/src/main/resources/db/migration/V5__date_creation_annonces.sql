-- Onglet « Nouveautés » : date de création de chaque annonce (les annonces existantes prennent la date du jour).

ALTER TABLE collectibles ADD COLUMN created_at timestamp(6) with time zone NOT NULL DEFAULT now();
