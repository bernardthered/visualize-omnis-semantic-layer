import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { embedSsoDashboard } from '@omni-co/embed'

// Vite server plugin that exposes a local-only API endpoint for generating
// signed Omni embed URLs.  The secret stays in Node — it never reaches the
// browser bundle or network responses beyond the signed URL itself.
function omniEmbedPlugin() {
  return {
    name: 'omni-embed-api',
    configureServer(server) {
      server.middlewares.use('/api/embed-url', async (req, res) => {
        try {
          const qs = new URL(req.url, 'http://localhost').searchParams
          const contentId   = qs.get('contentId')   || '8768d51b'
          const prefersDark = qs.get('prefersDark') || 'system'

          const secret = process.env.OMNI_EMBED_SECRET
          if (!secret) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: 'OMNI_EMBED_SECRET is not set. Add it to app/.env.local and restart the dev server.',
            }))
            return
          }

          const iframeUrl = await embedSsoDashboard({
            contentId,
            externalId:       process.env.OMNI_EMBED_EXTERNAL_ID || 'embed-user',
            name:             process.env.OMNI_EMBED_NAME         || 'Embed User',
            host:             process.env.OMNI_EMBED_HOST,
            secret,
            prefersDark,
          })

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ url: iframeUrl }))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), omniEmbedPlugin()],
  server: { port: 5175, host: '127.0.0.1' },
})
