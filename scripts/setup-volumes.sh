#!/bin/bash

# Script to create Docker volumes for FitInfinity application

echo "Creating Docker volumes for FitInfinity..."

# Create network if it doesn't exist
docker network create fitinfinity-shared 2>/dev/null || echo "Network fitinfinity-shared already exists"

# Create volumes
echo "Creating postgres data volume..."
docker volume create fitinfinity_postgres_data 2>/dev/null || echo "Volume fitinfinity_postgres_data already exists"

echo "Creating uploads data volume..."
docker volume create fitinfinity_uploads_data 2>/dev/null || echo "Volume fitinfinity_uploads_data already exists"

echo "Creating assets data volume..."
docker volume create fitinfinity_assets_data 2>/dev/null || echo "Volume fitinfinity_assets_data already exists"

echo "All volumes created successfully!"

# List volumes
echo "Current volumes:"
docker volume ls | grep fitinfinity