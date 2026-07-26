-- Migración formalizada a partir de supabase/add_unique_name.sql (aplicado originalmente el 2026-07-18).
-- Evita que vuelva a haber productos duplicados por nombre (ignorando mayúsculas/espacios).
create unique index products_name_lower_idx on products (lower(btrim(name)));
