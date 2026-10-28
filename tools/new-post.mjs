#!/usr/bin/env node
/**
 * 新建一篇文章：在 src/content/posts/ 下生成一个带 frontmatter 的 .md 文件
 *
 * 用法：
 *   node tools/new-post.mjs "文章标题"
 *   node tools/new-post.mjs "文章标题" --slug my-post --tags 前端,性能
 *
 * 生成后直接写正文，然后 git commit & push，GitHub Actions 会自动构建发布。
 */
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'src', 'content', 'posts');

const argv = process.argv.slice(2);
if (!argv.length || argv[0].startsWith('--')) {
  console.error('用法：node tools/new-post.mjs "文章标题" [--slug my-post] [--tags 前端,随笔]');
  process.exit(1);
}

const title = argv[0];
const opts = {};
for (let i = 1; i < argv.length; i++) {
  const k = argv[i];
  if (!k.startsWith('--')) continue;
  const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '';
  opts[k.slice(2)] = v;
}

const today = new Date();
const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const slug = (opts.slug || `post-${ymd.replace(/-/g, '')}`).replace(/[^\w-]/g, '-').toLowerCase();
const tags = (opts.tags || '').split(',').map((s) => s.trim()).filter(Boolean);

if (existsSync(join(DIR, `${slug}.md`))) {
  console.error(`已存在：${slug}.md，换一个 --slug`);
  process.exit(1);
}

const fm = [
  '---',
  `title: ${JSON.stringify(title)}`,
  `date: ${ymd}`,
  tags.length ? `tags: [${tags.map((t) => JSON.stringify(t)).join(', ')}]` : 'tags: []',
  'summary: ""',
  '---',
  '',
  '## 我要解决什么问题',
  '',
  '',
  '## 我试了什么',
  '',
  '',
  '## 结果',
  '',
  '',
  '## 我错在哪',
  '',
  '请把 summary 补上——它决定列表页摘要和文章 description（SEO 用）。',
];
writeFileSync(join(DIR, `${slug}.md`), fm.join('\n'));
console.log(`已创建 src/content/posts/${slug}.md`);
