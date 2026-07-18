-- 1) Revisar si ya hay productos duplicados por nombre (ignorando mayúsculas/espacios)
-- Corré esto primero. Si devuelve filas, hay que resolverlas antes del paso 2.
select lower(btrim(name)) as nombre_normalizado, count(*), array_agg(id) as ids, array_agg(quantity) as cantidades
from products
group by lower(btrim(name))
having count(*) > 1;

-- 2) Recién cuando el query de arriba no devuelva filas (o ya resolviste los duplicados
-- a mano: sumar cantidades en uno y borrar el otro), corré esto para que no vuelva a pasar:
create unique index products_name_lower_idx on products (lower(btrim(name)));
