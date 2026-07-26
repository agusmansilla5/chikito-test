import { config } from 'dotenv';

config({ path: '.env.test.local' });

for (const key of ['SUPABASE_TEST_URL', 'SUPABASE_TEST_ANON_KEY', 'SUPABASE_TEST_SERVICE_ROLE_KEY']) {
  if (!process.env[key]) {
    throw new Error(
      `Falta ${key} en web/.env.test.local. Ver README de tests en web/tests/README.md.`
    );
  }
}
