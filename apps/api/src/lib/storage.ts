import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Variable d'environnement requise manquante : ${name}`)
  return val
}

// Initialisation lazy — évite de faire échouer le démarrage (et les tests)
// si les vars S3 ne sont pas encore configurées. L'erreur est levée à la première utilisation.
let _s3: S3Client | null = null

function getS3(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      endpoint:    requireEnv('S3_ENDPOINT'),
      region:      process.env.S3_REGION ?? 'us-east-1',
      credentials: {
        accessKeyId:     requireEnv('S3_ACCESS_KEY'),
        secretAccessKey: requireEnv('S3_SECRET_KEY'),
      },
      forcePathStyle: true,
    })
  }
  return _s3
}

const BUCKET = process.env.S3_BUCKET ?? 'tranzit'

export async function uploadFile(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  await getS3().send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        new Uint8Array(body),
    ContentType: contentType,
  }))
}

export async function getSignedDownloadUrl(key: string, expiresIn = 900): Promise<string> {
  return getSignedUrl(getS3(), new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn })
}

export async function deleteFile(key: string): Promise<void> {
  await getS3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

// Sanitise un segment de path S3 : supprime les traversées et les caractères dangereux
function sanitizeSegment(segment: string): string {
  return segment.replace(/[/\\..]/g, '_').replace(/[^\w\-]/g, '_').slice(0, 100)
}

export function buildStorageKey(
  reference: string,
  typeDoc:   string,
  filename:  string,
): string {
  const year    = new Date().getFullYear()
  const id      = crypto.randomUUID()
  const rawExt  = filename.split('.').pop() ?? 'bin'
  const ext     = rawExt.replace(/[^\w]/g, '').slice(0, 10) || 'bin'
  return `dossiers/${year}/${sanitizeSegment(reference)}/${sanitizeSegment(typeDoc)}/${id}.${ext}`
}
