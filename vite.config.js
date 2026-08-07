import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Fail the build if Firebase env vars are missing. Deploying a bundle built
// without them produces a blank site (auth/invalid-api-key at runtime).
const REQUIRED_ENV = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of REQUIRED_ENV) {
    if (!env[key]) {
      throw new Error(
        `Missing ${key}. Copy .env.example to .env and fill in the Firebase values before building.`,
      )
    }
  }
  return {
    plugins: [react(), tailwindcss()],
  }
})
