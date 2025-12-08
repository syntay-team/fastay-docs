import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Fastay.js',
  tagline: 'Productivity-first backend framework for Node.js',
  favicon: 'img/favicon.ico',

  url: 'https://fastay.dev',
  baseUrl: '/',

  organizationName: 'syntay',
  projectName: 'fastay',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt']
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/syntay-team/fastay/tree/main/docs/',
          routeBasePath: '/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/syntay-team/fastay/tree/main/docs/'
        },
        theme: {
          customCss: './src/css/custom.css'
        }
      } satisfies Preset.Options
    ]
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true
    },
    navbar: {
      title: 'Fastay.js',
      logo: {
        alt: 'Fastay Logo',
        src: 'img/fastay-logo.png',
        srcDark: 'img/fastay-logo.png'
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation'
        },
        {
          type: 'docSidebar',
          sidebarId: 'apiSidebar',
          position: 'left',
          label: 'API Reference'
        },
        { to: '/blog', label: 'Blog', position: 'left' },
        {
          type: 'localeDropdown',
          position: 'right'
        },
        {
          href: 'https://github.com/syntay-team/fastay',
          label: 'GitHub',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/getting-started' },
            { label: 'Guides', to: '/guides/overview' },
            { label: 'API Reference', to: '/api-reference/create-app' }
          ]
        },
        {
          title: 'Community',
          items: [
            { label: 'Discord', href: 'https://discord.gg/syntay' },
            { label: 'Twitter', href: 'https://twitter.com/fastayjs' },
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/syntay-team/fastay/discussions'
            }
          ]
        },
        {
          title: 'More',
          items: [
            { label: 'Blog', to: '/blog' },
            { label: 'GitHub', href: 'https://github.com/syntay-team/fastay' },
            {
              label: 'npm',
              href: 'https://www.npmjs.com/package/@syntay/fastay'
            }
          ]
        }
      ],
      copyright: `© ${new Date().getFullYear()} Fastay.js. Released under the MIT License.`
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript']
    }
  } satisfies Preset.ThemeConfig
};

export default config;
