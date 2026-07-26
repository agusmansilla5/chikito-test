-- Migración formalizada a partir de supabase/add_proveedores_pedidos_1_enum.sql (aplicado originalmente el 2026-07-24).
-- Proveedores y Pedidos (paso 1 de 2): nuevo estado de orden de compra.
-- Tiene que correrse SOLO (en su propia ejecución) antes de
-- add_proveedores_pedidos_2.sql, porque Postgres no permite usar un valor de
-- enum agregado con ALTER TYPE ... ADD VALUE en la misma transacción en que
-- se agrega. La CLI de Supabase corre cada migración en su propia
-- transacción, así que separarlas en dos archivos sigue siendo necesario.

alter type purchase_order_status add value if not exists 'pendiente_envio';
