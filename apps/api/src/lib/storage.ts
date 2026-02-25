import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const s3 = new S3Client({
  endpoint:         process.env.S3_ENDPOINT!,
  region:           process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,  // nécessaire pour MinIO
})

const BUCKET = process.env.S3_BUCKET ?? 'tranzit'

export async function uploadFile(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        new Uint8Array(body),
    ContentType: contentType,
  }))
}

export async function getSignedDownloadUrl(key: string, expiresIn = 900): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn })
}

export async function deleteFile(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export function buildStorageKey(
  reference: string,
  typeDoc:   string,
  filename:  string,
): string {
  const year = new Date().getFullYear()
  const id   = crypto.randomUUID()
  const ext  = filename.split('.').pop() ?? 'bin'
  return `dossiers/${year}/${reference}/${typeDoc}/${id}.${ext}`
}
