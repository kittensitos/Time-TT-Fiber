import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// On Google Cloud Workstations port 80 is the editor and only ports >=1024 are
// forwardable via https://<port>-<workstation-host>, so use 8080 there.
const onCloudWorkstations = !!process.env.WEB_HOST?.endsWith('cloudworkstations.dev')

export default defineConfig(({ command, mode }) => {
  // Fail the production build early rather than shipping a bundle that cannot
  // reach Firebase (there is no runtime fallback).
  if (command === 'build') {
    const env = loadEnv(mode, process.cwd(), '')
    const required = ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID', 'VITE_FIREBASE_APP_ID']
    const missing = required.filter((key) => !env[key])
    if (missing.length > 0) {
      throw new Error(
        `Missing required Firebase config: ${missing.join(', ')}. Copy .env.example to .env and fill in the values.`,
      )
    }
  }

  return {
    plugins: [react()],
    server: {
      host: true,
      port: onCloudWorkstations ? 8080 : 80,
      allowedHosts: ['.cloudworkstations.dev'],
      ...(onCloudWorkstations ? { hmr: { clientPort: 443 } } : {}),
    },
  }
})
