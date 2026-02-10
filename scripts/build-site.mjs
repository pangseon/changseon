import { buildResume } from "./build-resume.mjs";
import { buildBlog } from "./build-blog.mjs";

async function main() {
  await buildResume();
  await buildBlog();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

