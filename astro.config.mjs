import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// 部署到 <user>.github.io/<repo>/ 时把 BASE_PATH 设为 '/<repo>'
// 绑了自定义域名（如 chaosharm0212.dev）时保持 '/'
const SITE = process.env.SITE ?? 'https://chaosharm0212.dev';
const BASE = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: 'github-dark', wrap: true },
  },
});
