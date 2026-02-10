function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizeText(s) {
  return String(s || '').toLowerCase().trim();
}

function formatDate(iso) {
  // ISO: YYYY-MM-DD
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${y}.${m}.${d}`;
}

async function loadPosts() {
  const res = await fetch('./posts.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`posts.json 로드 실패: ${res.status}`);
  const posts = await res.json();
  return Array.isArray(posts) ? posts : [];
}

function renderPosts(posts, query) {
  const q = normalizeText(query);
  const filtered = posts.filter(p => {
    if (!q) return true;
    const hay = [
      p.title,
      p.excerpt,
      (p.tags || []).join(' ')
    ].map(normalizeText).join(' ');
    return hay.includes(q);
  });

  const el = document.getElementById('posts');
  const countEl = document.getElementById('count');
  if (!el) return;

  if (countEl) countEl.textContent = String(filtered.length);

  if (filtered.length === 0) {
    el.innerHTML = `
      <div class="card">
        <div style="color: var(--text-secondary);">검색 결과가 없습니다.</div>
      </div>
    `;
    return;
  }

  el.innerHTML = filtered.map(p => {
    const title = escapeHtml(p.title || '');
    const excerpt = escapeHtml(p.excerpt || '');
    const slug = encodeURIComponent(p.slug || '');
    const date = escapeHtml(formatDate(p.date));
    const tags = Array.isArray(p.tags) ? p.tags : [];

    return `
      <article class="card">
        <a href="./posts/${slug}.html">
          <div style="font-size: 18px; font-weight: 650;">${title}</div>
        </a>
        <div class="meta">
          <span>${date}</span>
          <span>·</span>
          <a href="./posts/${slug}.html" style="color: var(--accent); text-decoration: none;">읽기 →</a>
        </div>
        ${excerpt ? `<div class="excerpt">${excerpt}</div>` : ''}
        ${tags.length ? `<div class="tags">${tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      </article>
    `;
  }).join('');
}

async function main() {
  const input = document.getElementById('search');
  const status = document.getElementById('status');

  try {
    const posts = await loadPosts();
    if (status) status.textContent = '';
    renderPosts(posts, input ? input.value : '');

    if (input) {
      input.addEventListener('input', () => {
        renderPosts(posts, input.value);
      });
    }
  } catch (e) {
    if (status) status.textContent = String(e?.message || e);
    const el = document.getElementById('posts');
    if (el) {
      el.innerHTML = `
        <div class="card">
          <div style="color: var(--text-secondary);">글 목록을 불러오지 못했습니다.</div>
          <div style="margin-top: 8px; color: var(--text-muted); font-size: 13px;">${escapeHtml(String(e?.message || e))}</div>
        </div>
      `;
    }
  }
}

document.addEventListener('DOMContentLoaded', main);

