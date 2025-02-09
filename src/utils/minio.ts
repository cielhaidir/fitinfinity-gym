import { S3Client } from "@aws-sdk/client-s3";

if (!process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY || !process.env.MINIO_BUCKET || !process.env.MINIO_ENDPOINT) {
    throw new Error("MinIO access key and secret key must be defined in the environment variables.");
}

const s3Client = new S3Client({
    endpoint: process.env.MINIO_ENDPOINT, 
    region: "us-east-1",
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY, 
        secretAccessKey: process.env.MINIO_SECRET_KEY, 
    },
});

export default s3Client;
