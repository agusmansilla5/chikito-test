-- Migración formalizada a partir de supabase/revert_product_stock_backfill.sql (aplicado originalmente el 2026-07-21).
-- El backfill de fix_product_stock_backfill_policy.sql resultó no ser el
-- comportamiento correcto: sembrar todo el catálogo en cero en cada local
-- hacía que Cocina/Barra 2/Barra 3/Barra VIP mostraran productos que no
-- tienen nada que ver con esos sectores. El modelo correcto es que cada
-- local arranca vacío y solo acumula lo que se cuenta/registra ahí
-- específicamente (createLocation y createProduct ya se corrigieron para no
-- volver a sembrar de más).
--
-- Esto borra esas filas en cero que se acababan de crear por el backfill
-- retroactivo. En un proyecto nuevo, estos locales todavía no existen, así
-- que este delete no afecta ninguna fila.

delete from product_stock
where location_id in (
  select id from locations where name in ('Cocina', 'Barra 2', 'Barra 3', 'Barra VIP')
);
