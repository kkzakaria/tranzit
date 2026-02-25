import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { documents, dossiers } from '../db/schema'
import { requirePermission } from '../middleware/auth'
import { logAction } from '../services/audit.service'
import { uploadFile, getSignedDownloadUrl, deleteFile, buildStorageKey } from '../lib/storage'
import type { AuthUser } from '../middleware/auth'

const ALLOWED_MIME: Record<string, string> = {
  'application/pdf':  'pdf',
  'image/jpeg':       'jpg',
  'image/png':        'png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':       'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}
const MAX_SIZE = 20 * 1024 * 1024  // 20 Mo

const router = new Hono<{ Variables: { user: AuthUser } }>()

// POST /api/v1/dossiers/:dossierId/documents
router.post('/:dossierId/documents', requirePermission('document', 'upload'), async (c) => {
  const dossierId = c.req.param('dossierId')
  const user      = c.get('user')

  const [dossier] = await db.select().from(dossiers).where(eq(dossiers.id, dossierId))
  if (!dossier) return c.json({ error: 'Dossier introuvable' }, 404)

  const formData = await c.req.formData()
  const file     = formData.get('file') as File | null
  const typeDoc  = formData.get('typeDoc') as string | null

  if (!file)                       return c.json({ error: 'Fichier manquant' }, 400)
  if (!typeDoc)                    return c.json({ error: 'typeDoc manquant' }, 400)
  if (!ALLOWED_MIME[file.type])    return c.json({ error: 'Type de fichier non autorisé' }, 400)
  if (file.size > MAX_SIZE)        return c.json({ error: 'Fichier trop volumineux (max 20 Mo)' }, 400)

  const storageKey = buildStorageKey(dossier.reference, typeDoc, file.name)
  const buffer     = await file.arrayBuffer()

  await uploadFile(storageKey, buffer, file.type)

  const [doc] = await db.transaction(async (tx) => {
    const rows = await tx.insert(documents).values({
      dossierId,
      nom:        file.name,
      typeDoc:    typeDoc as never,
      storageKey,
      taille:     file.size,
      uploadedBy: user.id,
    }).returning()

    await logAction(tx as never, 'DOCUMENT_UPLOADED', 'DOCUMENT', rows[0].id, user, {
      meta: { documentId: rows[0].id, nom: file.name, typeDoc },
    })
    return rows
  })

  return c.json({ data: doc }, 201)
})

// GET /api/v1/documents/:id/url
router.get('/:id/url', requirePermission('document', 'read'), async (c) => {
  const [doc] = await db.select().from(documents).where(eq(documents.id, c.req.param('id')))
  if (!doc) return c.json({ error: 'Document introuvable' }, 404)

  const url = await getSignedDownloadUrl(doc.storageKey)
  return c.json({ data: { url, expiresIn: 900 } })
})

// DELETE /api/v1/documents/:id
router.delete('/:id', requirePermission('document', 'delete'), async (c) => {
  const user  = c.get('user')
  const [doc] = await db.select().from(documents).where(eq(documents.id, c.req.param('id')))
  if (!doc) return c.json({ error: 'Document introuvable' }, 404)

  await db.transaction(async (tx) => {
    await deleteFile(doc.storageKey)
    await tx.delete(documents).where(eq(documents.id, doc.id))
    await logAction(tx as never, 'DOCUMENT_DELETED', 'DOCUMENT', doc.id, user, { before: doc })
  })

  return new Response(null, { status: 204 })
})

export default router
