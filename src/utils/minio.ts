import * as Minio from 'minio'
import fs from 'fs'
import mime from 'mime-types' 
import { env } from '@/env.js'

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

/**
 * Mengupload profile picture ke MinIO dari file path
 */
export async function uploadProfilePicture(bucketName: string, objectName: string, filePath: string) {
    try {
        await createBucketIfNotExists(bucketName)

        // Ambil MIME type dari file
        const contentType = mime.lookup(filePath) || 'application/octet-stream'

        await s3Client.fPutObject(bucketName, objectName, filePath, {
            'Content-Type': contentType,
        })

        console.log(`File uploaded successfully to ${bucketName}/${objectName}`)

        return `http://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${bucketName}/${objectName}`
    } catch (error) {
        console.error('Error uploading profile picture:', error)
        throw error
    }
}

/**
 * Mengupload profile picture ke MinIO dari buffer (tanpa menyimpan ke disk)
 */
export async function uploadProfilePictureFromBuffer(bucketName: string, objectName: string, fileBuffer: Buffer, mimeType: string) {
    try {
        await createBucketIfNotExists(bucketName)

        await s3Client.putObject(bucketName, objectName, fileBuffer, fileBuffer.length, {
            'Content-Type': mimeType,
        })
        console.log(`File uploaded successfully to ${bucketName}/${objectName}`)

        return `http://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}/${bucketName}/${objectName}`
    } catch (error) {
        console.error('Error uploading profile picture:', error)
        throw error
    }
}
