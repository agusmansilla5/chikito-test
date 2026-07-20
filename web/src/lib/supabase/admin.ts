import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Cliente con la service role key: salta RLS por completo y puede usar la API
// de administración de Auth (crear/invitar/banear usuarios). Solo para usarse
// desde server actions ya protegidas por un chequeo de rol admin - este cliente
// en sí no valida nada.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
