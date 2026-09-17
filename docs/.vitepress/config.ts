import { defineConfig } from 'vitepress'

const origin = 'https://binariedus.github.io'
const home = `${origin}/rcip/`
const description =
  'React capabilities for AI assistants, UI agents, and tool calling—with live context, validation, policy, and confirmation.'
export default defineConfig({
  title: 'RCIP',
  description,
  base: '/rcip/',
  cleanUrls: false,
  sitemap: { hostname: home },
  head: [
    ['link', { rel: 'icon', href: '/rcip/favicon.svg', type: 'image/svg+xml' }],
    ['meta', { name: 'theme-color', content: '#14283f' }],
    ['meta', { name: 'google-site-verification', content: 't89Khi8ugeWwOATk9fJC1eX1xatcpUS2ykqtFd6LI8M' }],
  ],
  transformHead({ pageData }) {
    const path = pageData.relativePath
      .replace(/index\.md$/, '')
      .replace(/\.md$/, '.html')
    const url = `${home}${path}`
    const title = pageData.title
      ? `${pageData.title} | RCIP`
      : 'RCIP — React Capability Interface Protocol'
    return [
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:title', content: title }],
      [
        'meta',
        {
          property: 'og:description',
          content: pageData.description || description,
        },
      ],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:image', content: `${home}social-card.png` }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      [
        'script',
        { type: 'application/ld+json' },
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareSourceCode',
          name: 'RCIP',
          description,
          url: home,
          codeRepository: 'https://github.com/binariedus/rcip',
          programmingLanguage: 'TypeScript',
          license: 'https://www.apache.org/licenses/LICENSE-2.0',
          version: '2.0.3',
          runtimePlatform: 'React',
        }),
      ],
    ]
  },
  themeConfig: {
    logo: '/favicon.svg',
    search: { provider: 'local' },
    nav: [
      { text: 'Guide', link: '/quick-start' },
      { text: 'API', link: '/api' },
      { text: 'Try the demo', link: '/demo/', target: '_self' },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/binariedus/rcip' },
    ],
    sidebar: [
      {
        text: 'Start here',
        items: [
          { text: 'Quick start', link: '/quick-start' },
          { text: 'Standalone React starter', link: '/react-starter' },
          { text: 'Interactive demo', link: '/demo/', target: '_self' },
          {
            text: 'Why semantic capabilities?',
            link: '/semantic-capabilities',
          },
          { text: 'Finance case study', link: '/finance-case-study' },
          { text: 'RCIP and neighboring protocols', link: '/ecosystem' },
        ],
      },
      {
        text: 'Build an integration',
        items: [
          { text: 'API reference', link: '/api' },
          { text: 'Type contracts', link: '/api-types' },
          { text: 'Lifecycle and troubleshooting', link: '/lifecycle' },
          { text: 'Tool author guide', link: '/tool-author-guide' },
          {
            text: 'Assist and input pipelines',
            link: '/assist-and-input-pipelines',
          },
        ],
      },
      {
        text: 'Contracts and releases',
        items: [
          { text: 'Protocol 1.0', link: '/protocol' },
          { text: 'Security and privacy', link: '/security' },
          { text: 'Compatibility and bundles', link: '/compatibility' },
          { text: 'Migration from v1', link: '/migration-v1-to-v2' },
          { text: 'Changelog', link: '/changelog' },
          { text: 'Release process', link: '/releasing' },
          { text: 'Public health checks', link: '/health-monitoring' },
        ],
      },
    ],
    footer: {
      message: 'Apache-2.0 · Framework-neutral core · React 18 and 19',
      copyright: 'RCIP by Binaried',
    },
  },
})
