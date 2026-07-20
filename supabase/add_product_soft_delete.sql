-- Los productos dejan de borrarse físicamente: "Eliminar" pasa a marcar el producto
-- como inactivo (active = false) en vez de hacer DELETE, para no perder el historial
-- de movimientos asociado (antes, borrar un producto arrastraba en cascada todos sus
-- stock_movements por el "on delete cascade" del FK).

alter table products add column active boolean not null default true;

-- Defensa en profundidad: si alguna vez se borra un producto a mano (ej. desde el
-- dashboard de Supabase) en vez de desactivarlo desde la app, que la base lo rechace
-- si todavía tiene movimientos, en vez de borrarlos silenciosamente.
alter table stock_movements drop constraint stock_movements_product_id_fkey;
alter table stock_movements
  add constraint stock_movements_product_id_fkey
  foreign key (product_id) references products (id) on delete restrict;

-- Que un producto desactivado no siga apareciendo en la alerta de stock bajo.
create or replace view low_stock_products as
  select * from products where quantity < min_stock and active = true;

