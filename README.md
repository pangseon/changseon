# 이력서 + 블로그 (Netlify + Decap CMS)

이 저장소는 루트의 `index.html`(이력서)와 `/blog`(정적 블로그)로 구성되어 있습니다.

블로그 글은 `content/posts/*.md`(Markdown 원본)로 관리하고, 배포 시 `npm run build`가 아래 파일을 자동 생성합니다.

- `blog/posts.json` (글 목록)
- `blog/posts/*.html` (글 페이지)

## 로컬에서 확인

```bash
cd "/Users/parkchangseon/이력서"
npm install
npm run build
python3 -m http.server 5173
```

브라우저에서 `http://localhost:5173/` 로 접속합니다.

## Netlify 배포 (나만 글 수정/삭제)

1. Netlify에서 **Add new site → Import an existing project**로 GitHub 레포 연결
2. 빌드 설정은 `netlify.toml` 기준으로 자동 인식됩니다.
   - Build command: `npm run build`
   - Publish directory: `.`
3. Netlify 사이트에서 **Identity** 활성화
   - **Registration**: Open signup 비활성화(Invite only 권장)
   - 본인 이메일로 Invite 해서 계정 생성
4. Netlify 사이트에서 **Git Gateway** 활성화
5. 배포된 사이트에서 `/admin/` 접속 후 로그인
   - 로그인한 계정만 글 작성/수정/삭제 가능
   - 방문자는 일반 블로그 페이지(`/blog/`)를 읽기만 가능

## 글 작성

- `/admin/`에서 글을 작성하면 `content/posts/*.md`로 커밋됩니다.
- 배포 시 빌드가 자동 실행되며 `/blog`에 글 목록/글 페이지가 반영됩니다.

# changseon
