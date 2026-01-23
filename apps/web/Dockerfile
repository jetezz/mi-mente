FROM oven/bun:1 as base
WORKDIR /app

# 1. Copiar package.json
COPY package.json ./

# 2. Instalar dependencias con Bun
RUN bun install

# 3. Copiar resto del código
COPY . .

# 4. Construir para producción
RUN bun run build

# 5. Configurar entorno para correr el servidor
ENV HOST=0.0.0.0
ENV PORT=3000

# 6. Ejecutar el servidor generado (Astro con Node adapter genera un mjs ejecutable)
CMD ["bun", "run", "./dist/server/entry.mjs"]
