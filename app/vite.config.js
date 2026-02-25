import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { embedSsoDashboard, embedSsoContentDiscovery } from '@omni-co/embed'

// Vite server plugin that exposes a local-only API endpoint for generating
// signed Omni embed URLs.  The secret stays in Node — it never reaches the
// browser bundle or network responses beyond the signed URL itself.
function omniEmbedPlugin() {
  // loadEnv is called in the config hook (before configureServer) so that all
  // .env.local variables — including non-VITE_-prefixed ones — are available.
  // process.env alone is NOT sufficient: Vite only injects VITE_-prefixed vars
  // into the client bundle; server-side plugin code must use loadEnv directly.
  let env = {}

  return {
    name: 'omni-embed-api',

    config(_, { mode }) {
      // '' prefix → load ALL variables, not just VITE_-prefixed ones
      env = loadEnv(mode, process.cwd(), '')
    },

    configureServer(server) {
      server.middlewares.use('/api/embed-url', async (req, res) => {
        try {
          const qs = new URL(req.url, 'http://localhost').searchParams
          const contentId   = qs.get('contentId')   || '8768d51b'
          const prefersDark = qs.get('prefersDark') || 'system'

          const secret = env.OMNI_EMBED_SECRET
          if (!secret) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: 'OMNI_EMBED_SECRET is not set. Add it to app/.env.local and restart the dev server.',
            }))
            return
          }

          const sharedProps = {
            externalId: env.OMNI_EMBED_EXTERNAL_ID || 'embed-user',
            name:       env.OMNI_EMBED_NAME         || 'Embed User',
            host:       env.OMNI_EMBED_HOST,
            secret,
            prefersDark,
          }

          // /chat/<uuid> paths use embedSsoContentDiscovery (raw path, no prefix);
          // everything else uses embedSsoDashboard (/dashboards/<id>).
          const iframeUrl = contentId.startsWith('/chat/')
            ? await embedSsoContentDiscovery({ ...sharedProps, path: contentId })
            : await embedSsoDashboard({ ...sharedProps, contentId })

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
