docker stop coolify coolify-db coolify-redis coolify-realtime coolify-sentinel
docker rm coolify coolify-db coolify-redis coolify-realtime coolify-sentinel

curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash

## Clourfare

# Añadir la clave GPG de Cloudflare

sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-public-v2.gpg | sudo tee /usr/share/keyrings/cloudflare-public-v2.gpg >/dev/null

# Añadir el repositorio a tus fuentes

echo 'deb [signed-by=/usr/share/keyrings/cloudflare-public-v2.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list

# Instalar el paquete

sudo apt update && sudo apt install cloudflared

# login

cloudflared tunnel login

# crear tunel

cloudflared tunnel create mi-mente
id: 6a61396a-c55f-4ca6-9c0e-848bdfd204a3


# Configurar el archivo de Túnel
nano ~/.cloudflared/config.yml

tunnel: <TU_UUID>
credentials-file: /home/tu-usuario/.cloudflared/<TU_UUID>.json

ingress:
  - hostname: mimente.online
    service: http://localhost:4321
  - service: http_status:404


---------------------------------------------
tunnel: 6a61396a-c55f-4ca6-9c0e-848bdfd204a3
credentials-file: /home/jete/.cloudflared/6a61396a-c55f-4ca6-9c0e-848bdfd204a3.json

ingress:
  - hostname: mimente.online
    service: http://localhost:4321
  - service: http_status:404

# Vincular el dominio (DNS)
cloudflared tunnel route dns mi-mente mimente.online

# Ejecutar y Probar
cloudflared tunnel run mi-mente