# Usamos una imagen ligera de Python 3.10
FROM python:3.10-slim

# 1. Instalar dependencias del sistema (ffmpeg es CRUCIAL para audio)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# 2. Configurar directorio de trabajo
WORKDIR /app

# 3. Copiar requirements e instalar dependencias de Python
COPY requirements.txt .
# Instalamos las librerías
RUN pip install --no-cache-dir -r requirements.txt
# Forzar la última versión de yt-dlp directamente desde GitHub para tener los últimos parches anti-bloqueo
RUN pip install --no-cache-dir --upgrade --force-reinstall "git+https://github.com/yt-dlp/yt-dlp.git"

# 4. Copiar el código fuente
COPY . .

# 5. Exponer el puerto
EXPOSE 8000

# 6. Comando de inicio (FastAPI con reload para dev, sin reload para prod idealmente, pero útil aquí)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
