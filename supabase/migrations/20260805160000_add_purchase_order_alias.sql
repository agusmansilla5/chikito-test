-- Campo manual libre para identificar rápido un pedido en el listado
-- (ej. "urgente", "primer pedido nuevo local"), separado de la nota de
-- creación (purchase_orders.note, ya existente).
alter table purchase_orders add column if not exists alias text;
