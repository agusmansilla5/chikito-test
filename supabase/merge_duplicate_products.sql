-- Fusiona automáticamente productos duplicados (mismo nombre, ignorando mayúsculas/espacios):
-- conserva el más antiguo, le suma el stock de los duplicados, les pasa el historial
-- de movimientos, y borra los duplicados. Corré esto ANTES de add_unique_name.sql.
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

-- Verificación: no debería devolver filas
select lower(btrim(name)), count(*)
from products
group by lower(btrim(name))
having count(*) > 1;
