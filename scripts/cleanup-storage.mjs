import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local')
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

loadEnv()

async function cleanup() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!clientEmail || !privateKey) {
    console.error('Missing FIREBASE_ADMIN_CLIENT_EMAIL or FIREBASE_ADMIN_PRIVATE_KEY in .env.local')
    process.exit(1)
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    })
  }

  const bucket = getStorage().bucket()
  const prefix = 'users/'

  console.log(`Listing files under gs://${bucket.name}/${prefix}...`)
  const [files] = await bucket.getFiles({ prefix })

  if (files.length === 0) {
    console.log('No files found to delete.')
    return
  }

  console.log(`\nFound ${files.length} file(s):`)
  for (const f of files) {
    console.log(`  ${f.name}`)
  }

  console.log(`\nDeleting ${files.length} file(s)...`)
  let deleted = 0
  let errors = 0

  await Promise.all(
    files.map(async (file) => {
      try {
        await file.delete()
        deleted++
      } catch (err) {
        console.error(`  FAILED: ${file.name} — ${err.message}`)
        errors++
      }
    })
  )

  console.log(`\nDone. ${deleted} deleted, ${errors} failed.`)
}

cleanup().catch((err) => {
  console.error('Script failed:', err)
  process.exit(1)
})
