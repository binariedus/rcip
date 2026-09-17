import type { Plugin } from 'vite'
export function ssrFixturePlugin(): Plugin {
  return {
    name: 'rcip-ssr-fixture',
    configureServer(server) {
      server.middlewares.use('/__ssr', async (request, response, next) => {
        try {
          const name =
            new URL(request.url ?? '/', 'http://localhost').searchParams.get(
              'name',
            ) ?? 'Request'
          if (!/^[a-zA-Z0-9 -]{1,40}$/.test(name)) {
            response.statusCode = 400
            response.end()
            return
          }
          const renderer = await server.ssrLoadModule('/src/ssr-entry.tsx')
          const content = renderer.render(name)
          const html = await server.transformIndexHtml(
            '/__ssr',
            `<!doctype html><html><head><title>SSR fixture</title></head><body><div id="root" data-request-name="${name}">${content}</div><script type="module" src="/src/ssr-client.tsx"></script></body></html>`,
          )
          response.setHeader('Content-Type', 'text/html')
          response.end(html)
        } catch (error) {
          next(error)
        }
      })
    },
  }
}
