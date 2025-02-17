import * as Minio from 'minio'
import fs from 'fs'
import mime from 'mime-types' 
import { env } from '@/env.js'
import { db } from '@/server/db'
import { v4 as uuidv4 } from 'uuid'

export const s3Client = new Minio.Client({
    endPoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT ? Number(env.MINIO_PORT) : undefined,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
    useSSL: env.MINIO_SSL === 'true',
})

/**
 * Mengecek apakah bucket ada, jika tidak, maka akan dibuat
 */
export async function createBucketIfNotExists(bucketName: string) {
    try {
        const bucketExists = await s3Client.bucketExists(bucketName)
        if (!bucketExists) {
            await s3Client.makeBucket(bucketName)
            console.log(`Bucket "${bucketName}" created successfully.`)
        }
    } catch (error) {
        console.error(`Error creating bucket "${bucketName}":`, error)
        throw error
    }
}

export async function uploadProfileImage(userId: string, filePath: string, bucketName = 'profile-images') {
    try {
        await createBucketIfNotExists(bucketName)

        const fileStream = fs.createReadStream(filePath)
        const originalName = filePath.split('/').pop() || 'unknown'
        const fileExt = originalName.split('.').pop() || ''
        const mimeType = mime.lookup(filePath) || 'application/octet-stream'

        // Generate unique file name
        const fileName = `${uuidv4()}.${fileExt}`

        // Upload file ke MinIO
        const fileSize = fs.statSync(filePath).size
        await s3Client.putObject(bucketName, fileName, fileStream, fileSize, {
            'Content-Type': mimeType,
        })

        // Simpan metadata file ke database
        const uploadedFile = await db.file.create({
            data: {
                bucket: bucketName,
                fileName: fileName,
                originalName: originalName,
                size: fs.statSync(filePath).size,
            },
        })
        return {
            success: true,
            message: 'Profile image uploaded successfully.',
            fileUrl: `${env.MINIO_ENDPOINT}/${bucketName}/${fileName}`,
        }
    } catch (error) {
        console.error('Error uploading profile image:', error)
        throw new Error('Failed to upload profile image')
    }
}