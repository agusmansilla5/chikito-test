-- Campos adicionales de reservas pedidos por el negocio: cantidad de
-- invitados, detalle del servicio (ej. "1 pizza cada 5") y detalle de qué
-- se regala/no se regala (separado de is_gift, que solo indica sí/no).
alter table reservations add column if not exists guest_count integer;
alter table reservations add column if not exists service_detail text;
alter table reservations add column if not exists gift_detail text;
