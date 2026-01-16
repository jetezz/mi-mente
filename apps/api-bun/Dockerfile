# Usamos la imagen oficial de Bun
FROM oven/bun:1

WORKDIR /app

# 1. Copiar package.json e instalar dependencias
COPY package.json .
# COPY bun.lockb . # Comentado hasta que se genere
RUN bun install

# 2. Copiar código fuente
COPY . .

# 3. Exponer el puerto
EXPOSE 3000

# 4. Comando de inicio
CMD ["bun", "src/index.ts"]
