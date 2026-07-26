-- Migración formalizada a partir de supabase/merge_duplicate_products.sql
-- (aplicado originalmente el 2026-07-18, antes de add_unique_name.sql por
-- requisito explícito del script original: el índice único de la siguiente
-- migración fallaría si quedaran duplicados sin resolver).
--
-- Fusiona automáticamente productos duplicados (mismo nombre, ignorando mayúsculas/espacios):
-- conserva el más antiguo, le suma el stock de los duplicados, les pasa el historial
-- de movimientos, y borra los duplicados.
do $$
declare
  dup record;
  keep_id uuid;
begin
  for dup in
    select lower(btrim(name)) as norm_name
    from products
    group by lower(btrim(name))
    having count(*) > 1
  loop
    select id into keep_id
    from products
    where lower(btrim(name)) = dup.norm_name
    order by created_at asc
    limit 1;

    update stock_movements
    set product_id = keep_id
    where product_id in (
      select id from products
      where lower(btrim(name)) = dup.norm_name and id <> keep_id
    );

    update products
    set quantity = (
      select coalesce(sum(quantity), 0)
      from products
      where lower(btrim(name)) = dup.norm_name
    )
    where id = keep_id;

    delete from products
    where lower(btrim(name)) = dup.norm_name and id <> keep_id;
  end loop;
end $$;
