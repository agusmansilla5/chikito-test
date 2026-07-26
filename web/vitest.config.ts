import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    // Los tests pegan a una base Supabase real por red; el timeout default
    // de vitest (5s) se queda corto para las suites con varios pasos (crear
    // usuario, insertar fixtures, ejecutar el RPC, limpiar).
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
