# Control de Stock

App para gestionar el stock del local, con tres roles:

- **admin**: control total.
- **auditor**: registra entradas/salidas de stock, escanea/busca productos.
- **jefe**: solo lectura de reportes en tiempo real.

## Estructura del proyecto

```
mobile/     App móvil (Expo / React Native) — la usan admin y auditores en el local
web/        Dashboard web (Next.js) — lo usan los jefes desde la PC, deployable en Vercel
supabase/   Esquema SQL de la base de datos (Postgres + Auth + Realtime)
```

Ambas apps comparten el mismo backend de Supabase.

## 1. Crear el proyecto en Supabase

1. Andá a [supabase.com](https://supabase.com) y creá una cuenta y un proyecto nuevo (gratis).
2. En el proyecto, abrí **SQL Editor > New query**, pegá el contenido de [`supabase/schema.sql`](supabase/schema.sql) y ejecutalo. Esto crea las tablas, roles y políticas de seguridad.
3. En **Project Settings > API**, copiá:
   - `Project URL`
   - `anon public` key

## 2. Crear usuarios

Por ahora los usuarios se crean manualmente desde Supabase:

1. **Authentication > Users > Add user**, cargá email y contraseña.
2. En **Table Editor > profiles**, editá la fila creada automáticamente para ese usuario y asignale el `role` correcto (`admin`, `auditor` o `jefe`) y su `full_name`.

## 3. Configurar y correr la app móvil

```bash
cd mobile
cp .env.example .env
# completá EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en .env
npm install
npm start
```

Instalá **Expo Go** en tu celular (App Store / Play Store) y escaneá el código QR que aparece en la terminal. La app va a correr directo en tu teléfono, sin necesidad de build ni tienda.

## 4. Configurar y correr el dashboard web

```bash
cd web
cp .env.local.example .env.local
# completá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

### Desplegar el dashboard en Vercel

1. Subí este proyecto a GitHub.
2. En [vercel.com](https://vercel.com), importá el repo y seleccioná la carpeta `web` como **Root Directory**.
3. Cargá las variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en la configuración del proyecto en Vercel.
4. Deploy.

La app móvil **no** se despliega en Vercel — corre en los celulares vía Expo Go (para pruebas) o como build instalable con EAS Build (para producción, más adelante).

## Qué incluye esta primera versión

- Login con Supabase Auth.
- Roles: admin, auditor, jefe (permisos aplicados a nivel de base de datos con Row Level Security).
- Registrar entradas y salidas de stock desde la app móvil.
- Búsqueda de producto por código de barras (por texto, todavía sin cámara).
- Alertas de stock bajo.
- Reportes de movimientos, visibles desde la app móvil y desde el dashboard web (con actualización en tiempo real).

## Próximos pasos (a evolucionar)

- Escaneo de código de barras con la cámara (`expo-camera`).
- Exportación de reportes a Excel/PDF.
- Alta de productos y gestión de usuarios desde la propia app (hoy se hace manualmente en Supabase).
- Build de producción de la app móvil con EAS para instalarla sin Expo Go, o subirla a las tiendas.
