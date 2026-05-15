import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Blindspot',
  description: 'Observability without surveillance — privacy-first frontend OpenTelemetry.',
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],

  themeConfig: {
    logo: { light: '/logo-light.svg', dark: '/logo-dark.svg', alt: 'Blindspot' },

    nav: [
      { text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
      { text: 'Frameworks', link: '/framework/react', activeMatch: '/framework/' },
      { text: 'API Reference', link: '/api/', activeMatch: '/api/' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Privacy Model', link: '/guide/privacy' },
          { text: 'OTel Collector Setup', link: '/guide/collector' },
          { text: 'Grafana Dashboard', link: '/guide/grafana' },
        ],
      },
      {
        text: 'Framework Integrations',
        items: [
          { text: 'React', link: '/framework/react' },
          { text: 'Vue', link: '/framework/vue' },
          { text: 'Next.js', link: '/framework/next' },
          { text: 'Svelte / SvelteKit', link: '/framework/svelte' },
        ],
      },
      {
        text: 'Reference',
        items: [{ text: 'API Reference', link: '/api/' }],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/blindspot/blindspot' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Observability without surveillance.',
    },

    search: { provider: 'local' },

    editLink: {
      pattern: 'https://github.com/blindspot/blindspot/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
})
