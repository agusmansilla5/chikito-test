-- Migración formalizada a partir de supabase/fix_low_stock_threshold.sql (aplicado originalmente el 2026-07-18).
-- Si el stock es exactamente igual al mínimo, es stock ideal, no "bajo".
-- Solo se considera bajo cuando está por debajo del mínimo.
create or replace view low_stock_products as
  select * from products where quantity < min_stock;
