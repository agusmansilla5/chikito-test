# Tests de integración

Estos tests pegan a una base Supabase real (no mocks) para probar las funciones/triggers
críticos: `apply_stock_movement`, `receive_purchase_order`, `handle_new_user`. Corren contra
un **proyecto Supabase de prueba**, nunca contra el de producción.

## Setup (una vez)

1. Creá un proyecto nuevo (gratis) en [supabase.com](https://supabase.com/dashboard), separado
   del de producción.
2. Aplicale las migraciones de `supabase/migrations/`:

   ```bash
   npx supabase link --project-ref <ref-del-proyecto-de-prueba>
   npx supabase db push
   ```

3. Creá `web/.env.test.local` (no se commitea) con:

   ```
   SUPABASE_TEST_URL=https://<ref>.supabase.co
   SUPABASE_TEST_ANON_KEY=<anon key del proyecto de prueba>
   SUPABASE_TEST_SERVICE_ROLE_KEY=<service_role key del proyecto de prueba>
   ```

## Correr los tests

```bash
npm test
```

Cada test crea sus propios datos (usuarios, productos, locales, proveedores) con nombres
únicos y los borra al terminar (`afterEach`), así que es seguro correrlos repetidas veces
seguidas sin ensuciar el proyecto de prueba.
