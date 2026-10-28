# 知微 · Astro 版

从零构建的手写站迁移过来的版本：**每篇文章有独立地址**，可被搜索引擎收录、可被单独引用。

旧站的问题（原文 README 第 7 节自述）：文章地址是 `/#/post/slug`，`#` 后面的内容搜索引擎不单独收录，整站对 SEO 而言只有一个入口。这个版本解决的就是这件事。

## 结构

```
zhiwei/
├── src/
│   ├── content/posts/*.md      ← 文章（Markdown + frontmatter）
│   ├── content.config.ts       ← 集合定义与字段校验
│   ├── layouts/Base.astro      ← 页头页脚、title/description/og/canonical
│   ├── pages/
│   │   ├── index.astro         ← 首页列表
│   │   ├── posts/index.astro   ← 全部文章（按年分组）
│   │   ├── posts/[...slug].astro ← 文章页，真实路径 /posts/<slug>/
│   │   ├── about.astro
│   │   └── rss.xml.js          ← /rss.xml
│   ├── styles/global.css       ← 沿用原站设计令牌
│   └── ...
├── public/robots.txt, favicon.svg
├── tools/new-post.mjs          ← 新建文章
└── astro.config.mjs            ← site / base / sitemap
```

## 本地开发

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # 产物在 dist/
npm run preview  # 预览 dist
```

## 写一篇新文章

```bash
node tools/new-post.mjs "我的新文章" --tags AI,工程
# 然后编辑 src/content/posts/<slug>.md
```

frontmatter 字段：

| 字段 | 说明 |
| --- | --- |
| `title` | 标题（用于 `<title>`、og:title、列表） |
| `date` | `YYYY-MM-DD`，列表按它倒序 |
| `tags` | 数组，如 `["AI", "工程"]` |
| `summary` | 一句话摘要，**同时作为页面 description，SEO 靠它** |

文件名（去掉 `.md`）就是 URL：`src/content/posts/rag-notes.md` → `/posts/rag-notes/`。

## 部署到 GitHub Pages

1. 新建仓库（建议就叫 `zhiwei`，公开）。
2. 把本目录推上去（`main` 分支）。
3. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。
4. 推一次代码，Actions 会自动构建并发布。
5. 访问 `https://<用户名>.github.io/zhiwei/`。

> 用项目页（`/zhiwei/`）时，把 `.github/workflows/deploy.yml` 里的 `BASE_PATH: /zhiwei` 取消注释。
> 绑了自定义域名后，删掉 `BASE_PATH`，并把 `SITE` 改成你的域名。

## 绑自定义域名（推荐）

1. **买域名**：Cloudflare / Namecheap / 阿里云都行，`.dev` 约 $12/年，`.com` 约 ¥70/年。
   GitHub Pages 托管在境外，**不需要备案**。
2. **加 DNS 记录**（以根域名 `example.dev` 为例，A 记录指 GitHub）：

   | 类型 | 名称 | 值 |
   | --- | --- | --- |
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | `<用户名>.github.io` |

   用子域名（如 `blog.example.dev`）就只加一条 CNAME → `<用户名>.github.io`。
3. 仓库 **Settings → Pages → Custom domain** 填域名，等 DNS 检查通过。
4. 勾选 **Enforce HTTPS**（`.dev` 域名强制 HTTPS，必须开）。
5. 改 `astro.config.mjs` 和 `deploy.yml` 里的 `SITE`，推一次。

## 上线后自查

- [ ] `/posts/<slug>/` 能单独打开、能单独分享（有预览卡片）
- [ ] 每篇 `<title>` 和 `description` 各不相同（查看网页源代码）
- [ ] `/sitemap-index.xml`、`/rss.xml`、`/robots.txt` 可访问
- [ ] 在 [Google Search Console](https://search.google.com/search-console) 提交 sitemap
- [ ] 百度搜索资源平台提交（可选，AI 技术内容百度流量一般）

## 旧站怎么办

`chaosharm0212.github.io/blog/` 可以保留，把它的 `index.html` 换成一行跳转：

```html
<meta http-equiv="refresh" content="0; url=https://你的域名/">
```

这样旧链接和旧 RSS 订阅者不会断。
