-- Trois nouvelles illustrations de catégorie : les catégories déjà créées les reçoivent par leur nom.

UPDATE categories SET art = 'VINYLS'    WHERE name = 'Vinyles'        AND art = 'OTHER';
UPDATE categories SET art = 'FIGURINES' WHERE name = 'Figurines'      AND art = 'OTHER';
UPDATE categories SET art = 'BOOKS'     WHERE name = 'Livres anciens' AND art = 'OTHER';
