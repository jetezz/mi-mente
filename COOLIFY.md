docker stop coolify coolify-db coolify-redis coolify-realtime coolify-sentinel
docker rm coolify coolify-db coolify-redis coolify-realtime coolify-sentinel

curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
