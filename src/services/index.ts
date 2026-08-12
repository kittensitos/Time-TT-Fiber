import type { Backend } from './backend'
import { createFirebaseBackend, isFirebaseConfigured } from './firebase'

if (!isFirebaseConfigured) {
  throw new Error(
    'Missing Firebase web config: set the VITE_FIREBASE_* variables in .env (see .env.example) and rebuild.',
  )
}

export const backend: Backend = createFirebaseBackend()
