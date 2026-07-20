-- Costo y precio de venta por producto, para poder calcular margen / valor de stock.
-- Nullable a propósito: no hace falta cargar precios para todo el catálogo de una.

alter table products add column cost_price numeric(12,2);
alter table products add column sale_price numeric(12,2);
