export default defineConfig({
  integrations: [react(), tailwind()],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    host: true,
    port: 3000,
    https: false // <--- FUERZA HTTP AQUÍ
  },
  vite: {
    server: {
      https: false, // <--- DOBLE SEGURIDAD PARA VITE
      watch: {
        usePolling: true,
      }
    }
  }
});