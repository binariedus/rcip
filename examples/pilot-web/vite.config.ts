import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

import { pilotAgentPlugin } from './vite/agent-plugin'

export default defineConfig(({ mode }) => {
  const root = resolve(import.meta.dirname, '../..')
  const environment = { ...process.env, ...loadEnv(mode, root, '') }
  return {
    envDir: root,
    plugins: [react(), pilotAgentPlugin(environment)],
    server: {
      host: process.env.RCIP_PILOT_HOST ?? '0.0.0.0',
      port: Number(process.env.RCIP_PILOT_PORT ?? 4000),
      strictPort: true,
    },
  }
})
