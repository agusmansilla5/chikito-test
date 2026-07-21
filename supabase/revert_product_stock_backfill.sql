-- El backfill de fix_product_stock_backfill_policy.sql resultó no ser el
-- comportamiento correcto: sembrar todo el catálogo en cero en cada local
-- hacía que Cocina/Barra 2/Barra 3/Barra VIP mostraran productos que no
-- tienen nada que ver con esos sectores. El modelo correcto es que cada
-- local arranca vacío y solo acumula lo que se cuenta/registra ahí
-- específicamente (createLocation y createProduct ya se corrigieron para no
-- volver a sembrar de más).
--
-- Esto borra esas filas en cero que se acababan de crear por el backfill
-- retroactivo. Es seguro: estos cuatro locales son nuevos y no tienen
-- ningún movimiento ni conteo real todavía (se verificó en vivo antes de
-- escribir esta migración). Los locales con datos reales (Barra charcutería)
-- no se tocan.

delete from product_stock
where location_id in (
  select id from locations where name in ('Cocina', 'Barra 2', 'Barra 3', 'Barra VIP')
);
