# Docker Deployment Guide for FitInfinity

## File Upload Fix for Production

This guide explains how to fix file upload issues in production when using Docker containers.

### Problem
When deploying with Docker, uploaded files (payment proofs, PT photos, etc.) are stored inside the container's filesystem. When the container is restarted or recreated, these files are lost.

### Solution
We've implemented persistent volumes to store uploaded files outside the container.

## Setup Instructions

### 1. Create Docker Volumes
Run the setup script to create necessary volumes:

```bash
chmod +x scripts/setup-volumes.sh
./scripts/setup-volumes.sh
```

Or manually create volumes:

```bash
# Create network
docker network create fitinfinity-shared

# Create volumes
docker volume create fitinfinity_postgres_data
docker volume create fitinfinity_uploads_data
docker volume create fitinfinity_assets_data
```

### 2. Deploy the Application

```bash
# Build and start services
docker-compose up -d

# Run database migrations (if needed)
docker-compose exec app npx prisma migrate deploy

# Seed database (optional)
docker-compose --profile seed up seed
```

### 3. Verify File Upload Functionality

1. Access the application at `http://localhost:3099`
2. Navigate to checkout validation page
3. Try uploading a payment proof
4. Check that files persist after container restart:
   ```bash
   docker-compose restart app
   # Files should still be accessible
   ```

## Volume Mappings

- `/app/public/uploads` → `fitinfinity_uploads_data` (Payment proofs, general uploads)
- `/app/public/assets` → `fitinfinity_assets_data` (PT photos, profile images)

## File Permissions

The Dockerfile ensures proper permissions:
- Upload directories: `755` (rwxr-xr-x)
- Uploaded files: `644` (rw-r--r--)
- Owner: `nextjs:nodejs`

## Troubleshooting

### Check Volume Status
```bash
docker volume ls | grep fitinfinity
docker volume inspect fitinfinity_uploads_data
```

### Check Container Logs
```bash
docker-compose logs app
```

### Access Container Shell
```bash
docker-compose exec app sh
ls -la /app/public/uploads
ls -la /app/public/assets
```

### Reset Volumes (if needed)
```bash
docker-compose down
docker volume rm fitinfinity_uploads_data fitinfinity_assets_data
./scripts/setup-volumes.sh
docker-compose up -d
```

## Production Considerations

1. **Backup Strategy**: Regularly backup the volume data
2. **Monitoring**: Monitor disk usage of volumes
3. **Security**: Ensure proper file type validation
4. **Cleanup**: Implement cleanup for orphaned files

## File Upload Endpoints

- Payment validation uploads: `/api/trpc/paymentValidation.uploadFile`
- PT photo uploads: Uses `uploadPTPhoto()` function
- General uploads: Uses `uploadFile()` function

All uploads are now persistent across container restarts and deployments.