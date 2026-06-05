import { FirebaseApp, initializeApp, getApps } from 'firebase/app'
import { Auth, getAuth, GoogleAuthProvider } from 'firebase/auth'
import { Firestore, getFirestore } from 'firebase/firestore'
import { FirebaseStorage, getStorage } from 'firebase/storage'

const firebaseConfig = () => ({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
})

let app: FirebaseApp | undefined
let authInstance: Auth | undefined
let dbInstance: Firestore | undefined
let storageInstance: FirebaseStorage | undefined
let providerInstance: GoogleAuthProvider | undefined

function getApp(): FirebaseApp {
  if (!app) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig())
    } else {
      app = getApps()[0]
    }
  }
  return app
}

export function getAuthInstance(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getApp())
  }
  return authInstance
}

export function getDbInstance(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(getApp())
  }
  return dbInstance
}

export function getStorageInstance(): FirebaseStorage {
  if (!storageInstance) {
    storageInstance = getStorage(getApp())
  }
  return storageInstance
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!providerInstance) {
    providerInstance = new GoogleAuthProvider()
    providerInstance.addScope('https://www.googleapis.com/auth/gmail.send')
    providerInstance.addScope('https://www.googleapis.com/auth/userinfo.email')
    providerInstance.addScope('https://www.googleapis.com/auth/userinfo.profile')
    providerInstance.setCustomParameters({ prompt: 'consent' })
  }
  return providerInstance
}
