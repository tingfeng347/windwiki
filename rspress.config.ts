import path from 'node:path';
import { defineConfig, normalizeHref } from '@rspress/core';
import { pluginSitemap } from '@rspress/plugin-sitemap';
import katex from 'rspress-plugin-katex';
import mermaid from 'rspress-plugin-mermaid';

const siteOrigin = 'https://tingfeng347.github.io';
const base = '/windwiki/';
const pageHref = (routePath: string) => routePath.endsWith('/') ? routePath : normalizeHref(routePath);
const pageUrl = (routePath: string) => `${siteOrigin}${base}${pageHref(routePath).replace(/^\//, '')}`;
const sitemap = pluginSitemap();

export default defineConfig({
  root: 'docs',
  base,
  siteOrigin,
  title: 'WindWiki',
  description:
    "Tingfeng347's engineering knowledge base for Agent, LLM, Computer Vision, SLAM and Point Cloud.",
  lang: 'zh',
  icon: '/favicon.svg',
  globalStyles: path.join(import.meta.dirname, 'styles/index.css'),
  llms: true,
  // KaTeX handles math nodes after the built-in code highlighter.
  markdown: {
    shiki: {
      onError(error) {
        if (error instanceof Error && error.message.startsWith('Language `math` is not included')) return;
        throw error;
      },
    },
  },
  plugins: [
    mermaid(),
    katex(),
    {
      ...sitemap,
      // Match real HTML files on Pages, including routes for future articles.
      extendPageData(page, isProd) {
        return sitemap.extendPageData?.({ ...page, routePath: pageHref(page.routePath) }, isProd);
      },
    },
  ],
  head: [
    ['meta', { property: 'og:site_name', content: 'WindWiki' }],
    (route) => [
      'link',
      { rel: 'canonical', href: pageUrl(route.routePath) },
    ],
    (route) => [
      'meta',
      { property: 'og:url', content: pageUrl(route.routePath) },
    ],
  ],
  themeConfig: {
    lastUpdated: true,
    editLink: {
      docRepoBaseUrl: 'https://github.com/tingfeng347/windwiki/edit/main/docs',
    },
    llmsUI: { placement: 'outline', viewOptions: false },
    enableContentAnimation: false,
    enableAppearanceAnimation: false,
  },
});
