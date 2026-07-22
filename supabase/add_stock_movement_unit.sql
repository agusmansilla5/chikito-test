-- Unidad de medida libre por movimiento (se elige en cada carga, no queda
-- fija en el producto). No se toca product_stock.quantity ni el trigger que
-- lo actualiza: sigue siendo un número acumulado simple, como hasta ahora.
-- La unidad es solo para que quede registrado con qué se contó cada carga
-- (mL, L, gr, kg o unidad suelta).

alter table stock_movements add column if not exists unit text not null default 'u';

alter table stock_movements drop constraint if exists stock_movements_unit_check;
alter table stock_movements add constraint stock_movements_unit_check
  check (unit in ('u', 'kg', 'gr', 'L', 'mL'));
