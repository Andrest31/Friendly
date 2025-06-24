#!/bin/bash

set -e  # Прерывать выполнение при ошибках

echo "Pulling latest changes..."
git reset --hard origin/master
git pull origin master

echo "Installing dependencies..."
npm install

echo "Stopping old application..."
fuser -k 3000/tcp || true

pm2 stop all || true
pm2 delete all || true

echo "Building the project..."
npm run build

echo "Ensuring Redis is running..."
sudo systemctl restart redis

echo "Ensuring MySQL is running..."
sudo systemctl restart mysql

echo "Starting application..."
pm2 start server.js --name "friendly"