import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";
import { marked } from "marked";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content", "posts");
const BLOG_DIR = path.join(ROOT, "blog");
const BLOG_POSTS_DIR = path.join(BLOG_DIR, "posts");
const POSTS_JSON_PATH = path.join(BLOG_DIR, "posts.json");

function isMarkdownFile(name) {
  return name.toLowerCase().endsWith(".md") || name.toLowerCase().endsWith(".markdown");
}

function toIsoDate(input) {
  // accepts "YYYY-MM-DD" or Date-ish; returns "YYYY-MM-DD"
  if (!input) return "";
  const s = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const yyyy = String(d.getFullYear()).padStart(4, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map(String).filter(Boolean);
  return String(tags)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function buildPostHtml({ title, dateIso, tags, contentHtml, excerpt }) {
  const safeTitle = escapeHtml(title || "");
  const dateText = escapeHtml(formatDate(dateIso));
  const tagsText = (tags || []).map((t) => `#${escapeHtml(t)}`).join("</span>\n      <span>");
  const description = escapeHtml(excerpt || "");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} | 박창선</title>
  ${description ? `<meta name="description" content="${description}" />` : ""}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+KR:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/blog.css" />
  <meta name="color-scheme" content="dark">
</head>
<body>
  <header class="header">
    <div class="header-inner">
      <a class="header-logo" href="../../index.html">박창선<span>.</span></a>
      <nav class="nav">
        <a href="../index.html">블로그</a>
        <a href="../../index.html#projects">프로젝트</a>
        <a href="../../index.html#career">경력</a>
      </nav>
    </div>
  </header>

  <main class="container post">
    <div class="badge" style="display:inline-flex; margin-top: 18px;">
      <a href="../index.html" style="color: var(--text-secondary); text-decoration: none;">← 글 목록</a>
    </div>

    <h1 style="margin-top: 14px;">${safeTitle}</h1>
    <div class="post-meta">
      <span>${dateText}</span>
      ${tags && tags.length ? `<span>·</span>\n      <span>${tagsText}</span>` : ""}
    </div>

    <article class="content">
      ${contentHtml}
    </article>

    <footer class="footer">
      <p>© 2026 박창선</p>
    </footer>
  </main>
</body>
</html>
`;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function listMarkdownPosts() {
  let names = [];
  try {
    names = await fs.readdir(CONTENT_DIR);
  } catch (e) {
    if (e?.code === "ENOENT") return [];
    throw e;
  }

  const files = names.filter(isMarkdownFile);
  files.sort(); // stable; we will sort by date later
  return files.map((f) => path.join(CONTENT_DIR, f));
}

async function readPost(filePath) {
  const slug = path.basename(filePath).replace(/\.(md|markdown)$/i, "");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = matter(raw);
  const data = parsed.data || {};

  const title = String(data.title || slug);
  const dateIso = toIsoDate(data.date);
  const excerpt = data.excerpt ? String(data.excerpt) : "";
  const tags = normalizeTags(data.tags);

  const contentHtml = marked.parse(parsed.content || "");
  return { slug, title, dateIso, excerpt, tags, contentHtml };
}

async function cleanStaleHtml(generatedSlugs) {
  try {
    const names = await fs.readdir(BLOG_POSTS_DIR);
    const htmlFiles = names.filter((n) => n.toLowerCase().endsWith(".html"));
    await Promise.all(
      htmlFiles.map(async (n) => {
        const slug = n.replace(/\.html$/i, "");
        if (!generatedSlugs.has(slug)) {
          await fs.unlink(path.join(BLOG_POSTS_DIR, n));
        }
      })
    );
  } catch (e) {
    if (e?.code === "ENOENT") return;
    throw e;
  }
}

async function main() {
  await ensureDir(BLOG_POSTS_DIR);

  const mdFiles = await listMarkdownPosts();
  const posts = await Promise.all(mdFiles.map(readPost));

  // sort desc by date, fallback by slug
  posts.sort((a, b) => {
    const ad = a.dateIso || "";
    const bd = b.dateIso || "";
    if (ad !== bd) return bd.localeCompare(ad);
    return b.slug.localeCompare(a.slug);
  });

  const slugs = new Set(posts.map((p) => p.slug));
  await cleanStaleHtml(slugs);

  // write html pages
  await Promise.all(
    posts.map(async (p) => {
      const html = buildPostHtml(p);
      const outPath = path.join(BLOG_POSTS_DIR, `${p.slug}.html`);
      await fs.writeFile(outPath, html, "utf8");
    })
  );

  // write posts.json used by blog/assets/blog.js
  const list = posts.map((p) => ({
    title: p.title,
    slug: p.slug,
    date: p.dateIso,
    excerpt: p.excerpt,
    tags: p.tags,
  }));
  await fs.writeFile(POSTS_JSON_PATH, JSON.stringify(list, null, 2) + "\n", "utf8");

  console.log(`[blog] generated ${posts.length} posts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

