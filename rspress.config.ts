import path from 'node:path';
import { defineConfig, normalizeHref } from '@rspress/core';
import { pluginSitemap } from '@rspress/plugin-sitemap';
import katex from 'rspress-plugin-katex';
import mermaid from 'rspress-plugin-mermaid';
import { sidebarRestoreScript } from './components/sidebar-state';

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
  description: 'Tingfeng347 的工程知识库：记录技术学习笔记与工程实践。',
  lang: 'zh',
  icon: '/favicon.svg',
  llms: true,
  // 以下三个路径都要求绝对路径。样式汇总在 styles/index.css。
  globalStyles: path.join(import.meta.dirname, 'styles/index.css'),
  // 侧边栏折叠按钮。globalUIComponents 会渲染在 <Layout /> 的兄弟位置，不需要自定义主题。
  globalUIComponents: [
    path.join(import.meta.dirname, 'components/sidebar-toggle.tsx'),
  ],
  builderConfig: {
    html: {
      // 首次绘制前就恢复折叠状态，避免刷新时侧边栏先显示再收起。
      // Rspress 的 head 配置只支持 [tag, attrs]，带不了内联内容，所以走 Rsbuild 的 html.tags。
      tags: [{ tag: 'script', children: sidebarRestoreScript }],
    },
    output: {
      // 默认 4096：小于该值的图片会被内联成 base64 data URI。正文图片走打包器，
      // 于是几张几十 KB 的小图会变成一坨 base64 混进 llms-full.txt，对喂给模型没意义。
      // 设为 0 让所有图片都保持可解析的 URL。
      dataUriLimit: { image: 0 },
    },
  },
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
  },
});
