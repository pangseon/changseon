import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const RESUME_JSON_PATH = path.join(ROOT, "content", "resume.json");
const INDEX_HTML_PATH = path.join(ROOT, "index.html");

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeTemplateLiteral(str) {
  return String(str ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("${", "\\${");
}

function replaceBetween(src, startMarker, endMarker, newContent) {
  const startIdx = src.indexOf(startMarker);
  if (startIdx === -1) throw new Error(`start marker not found: ${startMarker}`);
  const startEnd = startIdx + startMarker.length;
  const endIdx = src.indexOf(endMarker, startEnd);
  if (endIdx === -1) throw new Error(`end marker not found: ${endMarker}`);
  return `${src.slice(0, startEnd)}\n${newContent}\n${src.slice(endIdx)}`;
}

function keywordClass(color) {
  const c = String(color || "").toLowerCase();
  if (c === "purple") return "keyword keyword-purple";
  if (c === "orange") return "keyword keyword-orange";
  return "keyword keyword-blue";
}

function renderHero(hero) {
  const name = escapeHtml(hero?.name || "");
  const subtitle = escapeHtml(hero?.subtitle || "");
  const badge = escapeHtml(hero?.badge || "");
  const github = String(hero?.github || "").trim();
  const email = String(hero?.email || "").trim();

  const githubHref = github ? escapeHtml(github) : "#";
  const emailHref = email ? `mailto:${escapeHtml(email)}` : "#";

  return `        <div class="hero-badge">${badge}</div>
        <h1>안녕하세요,<br><span class="gradient">${name}</span>입니다.</h1>
        <p class="hero-subtitle">${subtitle}</p>
        <div class="hero-links">
            <a href="${githubHref}" target="_blank" class="hero-link">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                GitHub
            </a>
            <a href="${emailHref}" class="hero-link">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0114.25 14H1.75A1.75 1.75 0 010 12.25v-8.5C0 2.784.784 2 1.75 2zM1.5 12.251c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V5.809L8.38 9.397a.75.75 0 01-.76 0L1.5 5.809v6.442zm13-8.181v-.32a.25.25 0 00-.25-.25H1.75a.25.25 0 00-.25.25v.32L8 7.88l6.5-3.81z"/></svg>
                Email
            </a>
        </div>
    </section>`;
}

function renderSummary(summary) {
  const items = Array.isArray(summary) ? summary : [];
  const defaultAfter = ["입니다.", "라고 생각합니다.", "를 추구합니다."];
  const lis = items
    .map((it, idx) => {
      // 기존 resume.json 구조(text + highlight)를 최대한 유지
      const text = escapeHtml(it?.text || "");
      const highlight = escapeHtml(it?.highlight || "");
      const after = escapeHtml(it?.after || "");
      const inferredAfter = (!after && items.length === 3 && idx < defaultAfter.length) ? defaultAfter[idx] : "";
      if (highlight) return `            <li class="summary-item">${text} <strong>${highlight}</strong>${after || inferredAfter}</li>`;
      return `            <li class="summary-item">${text}</li>`;
    })
    .join("\n");

  return `<section id="summary">
        <div class="section-header">
            <h2>세 줄로 요약하자면, 저는</h2>
            <div class="section-line"></div>
        </div>
        <ul class="summary-list">
${lis || "            <li class=\"summary-item\">(내용을 추가해 주세요)</li>"}
        </ul>
    </section>`;
}

function renderValues(values) {
  const items = Array.isArray(values) ? values : [];
  const cards = items
    .map((v) => {
      const emoji = escapeHtml(v?.emoji || "");
      const title = escapeHtml(v?.title || "");
      const desc = escapeHtml(v?.description || "");
      return `            <div class="value-card">
                <h3>${emoji} ${title}</h3>
                <p>${desc}</p>
            </div>`;
    })
    .join("\n");

  return `<section id="values">
        <div class="section-header">
            <h2>추구하는 것과 관심사는</h2>
            <div class="section-line"></div>
        </div>
        <div class="values-grid">
${cards || "            <div class=\"value-card\"><h3>추가 필요</h3><p>내용을 추가해 주세요.</p></div>"}
        </div>
    </section>`;
}

function renderSkills(skills) {
  const items = Array.isArray(skills) ? skills : [];
  const groups = items
    .map((g) => {
      const group = escapeHtml(g?.group || "");
      const tags = Array.isArray(g?.tags) ? g.tags : [];
      const tagSpans = tags.map((t) => `                    <span class="skill-tag">${escapeHtml(t)}</span>`).join("\n");
      return `            <div class="skill-group">
                <div class="skill-group-title">${group}</div>
                <div class="skill-tags">
${tagSpans || "                    <span class=\"skill-tag\">(태그)</span>"}
                </div>
            </div>`;
    })
    .join("\n");

  return `<section id="skills">
        <div class="section-header">
            <h2>기술 스택</h2>
            <div class="section-line"></div>
        </div>
        <div class="skills-grid">
${groups || "            <div class=\"skill-group\"><div class=\"skill-group-title\">(그룹)</div></div>"}
        </div>
    </section>`;
}

function renderCareer(career) {
  const items = Array.isArray(career) ? career : [];
  const blocks = items
    .map((c) => {
      const company = escapeHtml(c?.company || "");
      const desc = escapeHtml(c?.description || "");
      const period = escapeHtml(c?.period || "");
      const duration = escapeHtml(c?.duration || "");
      const current = Boolean(c?.current);
      const keywords = Array.isArray(c?.keywords) ? c.keywords : [];
      const keywordSpans = keywords
        .map((k) => `<span class="${keywordClass(k?.color)}">${escapeHtml(k?.text || "")}</span>`)
        .join("\n                ");

      return `        <div class="career-item">
            <div class="career-header">
                <div>
                    <div class="career-company">${company}</div>
                    <div class="career-desc">${desc}</div>
                </div>
                <div style="text-align: right;">
                    ${current ? `<span class="career-current">재직중</span>` : ""}
                    <div class="career-period">${period}</div>
                    ${!current && duration ? `<div style="font-size:12px; color:var(--text-muted);">${duration}</div>` : ""}
                </div>
            </div>
            <div class="career-keywords">
                ${keywordSpans}
            </div>
        </div>`;
    })
    .join("\n\n");

  return `<section id="career">
        <div class="section-header">
            <h2>경력 사항</h2>
            <div class="section-line"></div>
        </div>

${blocks || "        <div class=\"career-item\">내용을 추가해 주세요.</div>"}
    </section>`;
}

function renderProjects(projects) {
  const items = Array.isArray(projects) ? projects : [];
  const blocks = items
    .map((p) => {
      const id = escapeHtml(p?.id || "");
      const title = escapeHtml(p?.title || "");
      const subtitle = escapeHtml(p?.subtitle || "");
      const period = escapeHtml(p?.period || "");
      const tags = Array.isArray(p?.tags) ? p.tags : [];

      const highlights = Array.isArray(p?.highlights) ? p.highlights : [];
      const listItems = (highlights.length ? highlights : [p?.description].filter(Boolean))
        .map((h) => `                <li>${escapeHtml(h)}</li>`)
        .join("\n");

      const tagSpans = tags.map((t) => `                <span class="project-tag">${escapeHtml(t)}</span>`).join("\n");

      return `        <div class="project-item" data-detail="${id}">
            <div class="project-header">
                <div class="project-title">${title}</div>
                <div class="career-period">${period}</div>
            </div>
            <div class="project-sub">${subtitle}</div>
            <ul class="project-list">
${listItems || "                <li>(내용을 추가해 주세요)</li>"}
            </ul>
            <div class="project-tags">
${tagSpans || ""}
            </div>
        </div>`;
    })
    .join("\n\n");

  return `<section id="projects">
        <div class="section-header">
            <h2>참여 프로젝트</h2>
            <div class="section-line"></div>
        </div>

${blocks || "        <div class=\"project-item\">내용을 추가해 주세요.</div>"}
    </section>`;
}

function renderEducation(education) {
  const school = escapeHtml(education?.school || "");
  const period = escapeHtml(education?.period || "");
  const major = escapeHtml(education?.major || "");
  return `<section id="education">
        <div class="section-header">
            <h2>학력</h2>
            <div class="section-line"></div>
        </div>
        <div class="edu-card">
            <div class="career-header">
                <h3>${school}</h3>
                <div class="career-period">${period}</div>
            </div>
            <p>${major}</p>
        </div>
    </section>`;
}

function renderProjectDetails(projects) {
  const items = Array.isArray(projects) ? projects : [];
  const entries = items
    .filter((p) => p?.id && (p?.detail_content || p?.detail_title))
    .map((p) => {
      const id = String(p.id);
      const title = String(p.detail_title || "상세 설명");
      const content = String(p.detail_content || "");
      return [id, { title, content }];
    });

  const lines = entries.map(([id, d]) => {
    const t = escapeTemplateLiteral(d.title);
    const c = escapeTemplateLiteral(d.content);
    return `    '${id}': {\n        title: '${t}',\n        content: \`${c}\`\n    }`;
  });

  return `    const projectDetails = {\n${lines.join(",\n")}\n};`;
}

export async function buildResume() {
  const resumeRaw = await fs.readFile(RESUME_JSON_PATH, "utf8");
  const resume = JSON.parse(resumeRaw);

  const indexRaw = await fs.readFile(INDEX_HTML_PATH, "utf8");

  let next = indexRaw;

  // HERO
  next = replaceBetween(next, "<!-- HERO_START -->", "<!-- HERO_END -->", renderHero(resume.hero));

  // SUMMARY
  next = replaceBetween(next, "<!-- SUMMARY_START -->", "<!-- SUMMARY_END -->", renderSummary(resume.summary));

  // VALUES
  next = replaceBetween(next, "<!-- VALUES_START -->", "<!-- VALUES_END -->", renderValues(resume.values));

  // SKILLS
  next = replaceBetween(next, "<!-- SKILLS_START -->", "<!-- SKILLS_END -->", renderSkills(resume.skills));

  // CAREER
  next = replaceBetween(next, "<!-- CAREER_START -->", "<!-- CAREER_END -->", renderCareer(resume.career));

  // PROJECTS
  next = replaceBetween(next, "<!-- PROJECTS_START -->", "<!-- PROJECTS_END -->", renderProjects(resume.projects));

  // EDUCATION
  next = replaceBetween(next, "<!-- EDUCATION_START -->", "<!-- EDUCATION_END -->", renderEducation(resume.education));

  // PROJECTDETAILS (inside script)
  next = replaceBetween(next, "// PROJECTDETAILS_START", "// PROJECTDETAILS_END", renderProjectDetails(resume.projects));

  await fs.writeFile(INDEX_HTML_PATH, next, "utf8");
  console.log("[resume] generated index.html from content/resume.json");
}

function isDirectRun() {
  const direct = new URL(`file://${process.argv[1]}`).href === import.meta.url;
  return direct;
}

if (isDirectRun()) {
  buildResume().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

