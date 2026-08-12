// Node.js의 파일 시스템 기능을 Promise 방식으로 사용한다.
// Markdown 파일을 생성하거나 삭제할 때 사용한다.
import fs from "fs/promises";

// 운영체제에 맞는 파일 경로를 안전하게 만들어준다.
import path from "path";

// Markdown 파일의 Front Matter(제목, 날짜, 태그 등)를 생성한다.
// 이미 블로그에서 사용 중인 gray-matter 패키지를 그대로 사용한다.
import matter from "gray-matter";

// Notion 공식 JavaScript SDK를 가져온다.
// isFullPage는 API 결과가 실제 Page 객체인지 확인하기 위해 사용한다.
import { Client, isFullPage } from "@notionhq/client";


// ============================================================
// 1. 환경변수 가져오기
// ============================================================

// .env.local에 저장한 Notion API Access Token
const notionToken = process.env.NOTION_TOKEN;

// 우리가 만든 Blog 데이터베이스의 Data Source ID
const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;


// Token이 없다면 실행을 중단한다.
if (!notionToken) {
  throw new Error(
    "NOTION_TOKEN이 없습니다. .env.local 파일을 확인해주세요."
  );
}


// Data Source ID가 없다면 실행을 중단한다.
if (!dataSourceId) {
  throw new Error(
    "NOTION_DATA_SOURCE_ID가 없습니다. .env.local 파일을 확인해주세요."
  );
}


// ============================================================
// 2. Notion Client 생성
// ============================================================

const notion = new Client({
  // Notion API 인증에 사용하는 Access Token
  auth: notionToken,

  // 현재 사용하고 있는 Notion API 버전
  notionVersion: "2026-03-11",
});


// ============================================================
// 3. Markdown 저장 위치 설정
// ============================================================

// 현재 프로젝트 경로/content/posts
const postsDirectory = path.join(
  process.cwd(),
  "content",
  "posts"
);


// Notion이 자동 생성한 파일 목록을 기록하는 파일이다.
//
// 이 파일이 필요한 이유:
// Published 체크를 해제하거나 Slug를 바꿨을 때
// 예전 Markdown 파일을 자동으로 제거하기 위함이다.
const manifestPath = path.join(
  postsDirectory,
  ".notion-sync.json"
);


// ============================================================
// 4. Notion Rich Text → 일반 문자열
// ============================================================

// Notion의 title이나 rich_text는 배열 형태이므로
// plain_text 값만 이어붙여 일반 문자열로 바꾼다.
function richTextToString(richText = []) {
  return richText
    .map((text) => text.plain_text ?? "")
    .join("");
}


// ============================================================
// 5. 각 Notion Property를 쉽게 읽기 위한 함수들
// ============================================================

// Title 속성 읽기
function getTitle(page) {
  const property = page.properties.Title;

  // Title 타입이 맞는지 확인한다.
  if (!property || property.type !== "title") {
    return "";
  }

  return richTextToString(property.title);
}


// Slug 속성 읽기
function getSlug(page) {
  const property = page.properties.Slug;

  // 우리가 만든 Slug는 rich_text 타입이다.
  if (!property || property.type !== "rich_text") {
    return "";
  }

  const slug = richTextToString(property.rich_text);

  // 앞뒤 공백 제거
  // 중간 공백은 "-"로 변환
  // "/"나 "\"는 파일 경로 문제가 생길 수 있으므로 "-"로 바꾼다.
  return slug
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}


// Description 속성 읽기
function getDescription(page) {
  const property = page.properties.Description;

  if (!property || property.type !== "rich_text") {
    return "";
  }

  return richTextToString(property.rich_text);
}


// Date 속성 읽기
function getDate(page) {
  const property = page.properties.Date;

  // Date가 제대로 입력되어 있다면 사용한다.
  if (
    property &&
    property.type === "date" &&
    property.date?.start
  ) {
    return property.date.start.slice(0, 10);
  }

  // Date를 입력하지 않았다면
  // Notion 페이지가 만들어진 날짜를 대신 사용한다.
  return page.created_time.slice(0, 10);
}


// Tags 속성 읽기
function getTags(page) {
  const property = page.properties.Tags;

  if (!property || property.type !== "multi_select") {
    return [];
  }

  // [{ name: "Next.js" }, { name: "Notion" }]
  // 형태를
  // ["Next.js", "Notion"]
  // 형태로 변환한다.
  return property.multi_select.map((tag) => tag.name);
}

// Notion의 Types 멀티셀렉트 속성을 문자열 배열로 변환
function getTypes(page) {
  const property = page.properties.Types;

  // Types가 없거나 multi_select 타입이 아니면 빈 배열 반환
  if (!property || property.type !== "multi_select") {
    return [];
  }

  // [{ name: "Development" }, ...]
  // → ["Development", "Study", ...]
  return property.multi_select.map((type) => type.name);
}

// ============================================================
// 6. 이전 동기화 기록과 파일을 안전하게 관리
// ============================================================

async function readPreviousManifest() {
  try {
    const manifestText = await fs.readFile(
      manifestPath,
      "utf8"
    );
    const manifest = JSON.parse(manifestText);

    if (!Array.isArray(manifest.files)) {
      throw new Error(
        ".notion-sync.json의 files가 배열이 아닙니다."
      );
    }

    const files = manifest.files.map((fileName) => {
      if (
        typeof fileName !== "string" ||
        path.basename(fileName) !== fileName ||
        !fileName.endsWith(".md")
      ) {
        throw new Error(
          `.notion-sync.json에 잘못된 파일명이 있습니다: ${String(fileName)}`
        );
      }

      return fileName;
    });

    return { files };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { files: [] };
    }

    throw error;
  }
}


// 파일이 없으면 null, 있으면 현재 내용을 반환한다.
async function readTextIfExists(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}


// 내용이 실제로 달라졌을 때만 임시 파일을 거쳐 교체한다.
async function writeTextIfChanged(filePath, contents) {
  const currentContents = await readTextIfExists(filePath);

  if (currentContents === contents) {
    return false;
  }

  const temporaryPath = `${filePath}.${process.pid}.tmp`;

  try {
    await fs.writeFile(temporaryPath, contents, "utf8");
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }

  return true;
}


// 모든 Notion 변환이 성공한 뒤에만 파일 생성/수정/삭제를 적용한다.
async function applyGeneratedPosts(generatedPosts) {
  const previousManifest = await readPreviousManifest();
  const generatedFiles = [...generatedPosts.keys()].sort();

  for (const fileName of generatedFiles) {
    const filePath = path.join(postsDirectory, fileName);
    const fileContents = generatedPosts.get(fileName);

    await writeTextIfChanged(filePath, fileContents);
  }

  // 현재 Notion에 없는 예전 자동 생성 글만 마지막에 제거한다.
  for (const fileName of previousManifest.files) {
    if (!generatedPosts.has(fileName)) {
      await fs.rm(path.join(postsDirectory, fileName), {
        force: true,
      });
    }
  }

  // 시간값을 넣지 않아 내용이 같으면 쓸데없는 커밋이 생기지 않는다.
  const manifestContents = `${JSON.stringify(
    { files: generatedFiles },
    null,
    2
  )}\n`;

  await writeTextIfChanged(
    manifestPath,
    manifestContents
  );
}


// ============================================================
// 7. Published 글 전체 가져오기
// ============================================================

async function getPublishedPages() {
  const pages = [];

  // Notion API는 데이터가 많으면 여러 페이지로 나눠서 반환한다.
  // 다음 페이지를 가져오기 위해 사용하는 cursor다.
  let cursor = undefined;

  do {
    const response = await notion.dataSources.query({
      // Blog Data Source
      data_source_id: dataSourceId,

      // Published가 체크된 글만 가져온다.
      filter: {
        property: "Published",

        checkbox: {
          equals: true,
        },
      },

      // 최신 게시글부터 가져온다.
      sorts: [
        {
          property: "Date",
          direction: "descending",
        },
      ],

      // 두 번째 페이지부터 사용할 cursor
      start_cursor: cursor,
    });

    // 이번 요청에서 받은 결과를 추가한다.
    pages.push(...response.results);

    // 다음 페이지가 있다면 cursor를 저장한다.
    cursor = response.has_more
      ? response.next_cursor
      : undefined;

  } while (cursor);

  return pages;
}


// ============================================================
// 8. 실제 Notion → Markdown 동기화
// ============================================================

async function syncNotionPosts() {
  console.log("");
  console.log("🚀 Notion 블로그 동기화 시작");
  console.log("");

  // content/posts 폴더가 없다면 자동 생성한다.
  await fs.mkdir(postsDirectory, {
    recursive: true,
  });


  // Published = true인 글들을 가져온다.
  // 조회나 변환이 실패해도 기존 파일은 그대로 유지된다.
  const pages = await getPublishedPages();

  console.log(
    `📚 Published 글 ${pages.length}개 발견`
  );

  console.log("");


  // 모든 글을 메모리에 준비한 다음 한 번에 반영한다.
  const generatedPosts = new Map();


  // ==========================================================
  // 각각의 Notion 페이지를 Markdown으로 변환
  // ==========================================================

  for (const result of pages) {

    // API 결과가 실제 Page 객체인지 확인한다.
    if (!isFullPage(result)) {
      throw new Error(
        "Notion에서 완전한 Page 데이터를 받지 못했습니다."
      );
    }


    // ------------------------------------------
    // 데이터베이스 Property 가져오기
    // ------------------------------------------

    const title = getTitle(result);
    const slug = getSlug(result);
    const date = getDate(result);
    const description = getDescription(result);
    const tags = getTags(result);
    const types = getTypes(result);


    if (!title) {
      throw new Error(
        `Published 글에 Title이 없습니다: ${result.id}`
      );
    }


    // Slug가 없으면 기존 글을 잘못 삭제하지 않도록 동기화를 중단한다.
    if (!slug) {
      throw new Error(
        `Published 글에 Slug가 없습니다: ${title}`
      );
    }


    // ------------------------------------------
    // Notion 페이지 본문 → Markdown
    // ------------------------------------------

    const markdownResponse =
      await notion.pages.retrieveMarkdown({
        // 데이터베이스의 각 행은 하나의 Notion Page다.
        page_id: result.id,
      });


    // Notion에서 반환한 실제 Markdown 본문
    const markdownBody = markdownResponse.markdown;


    // 잘린 본문으로 기존의 정상 글을 덮어쓰지 않는다.
    if (markdownResponse.truncated) {
      throw new Error(
        `Notion 본문이 잘려 동기화를 중단합니다: ${title}`
      );
    }


    // ------------------------------------------
    // Front Matter 생성
    // ------------------------------------------

    const frontMatter = {
      // 블로그 제목
      title,

      // 작성 날짜
      date,

      // 글 설명
      description,

      // 태그 배열
      tags,

      // 타입 배열
      types,

      // 나중에 어떤 Notion Page에서 생성됐는지 확인하기 위한 ID
      notionPageId: result.id,
    };


    // gray-matter가 Front Matter + Markdown을 합쳐준다.
    const fileContents = matter.stringify(
      `${markdownBody.trim()}\n`,
      frontMatter
    );


    // Slug가 블로그 URL과 파일 이름이 된다.
    //
    // first-notion-post
    // ↓
    // first-notion-post.md
    const fileName = `${slug}.md`;


    // 같은 Slug를 가진 글이 여러 개면 마지막 글로 덮어쓰지 않는다.
    if (generatedPosts.has(fileName)) {
      throw new Error(
        `중복 Slug가 있습니다: ${slug}`
      );
    }


    // 아직 디스크를 수정하지 않고 생성 예정 목록에만 보관한다.
    generatedPosts.set(fileName, fileContents);


    console.log(
      `✅ ${title}`
    );

    console.log(
      `   → content/posts/${fileName}`
    );
  }


  // 모든 API 조회와 Markdown 변환이 끝난 뒤에만 실제 파일을 바꾼다.
  await applyGeneratedPosts(generatedPosts);


  console.log("");
  console.log("🎉 Notion 동기화 완료");
}


// ============================================================
// 10. 프로그램 실행
// ============================================================

syncNotionPosts().catch((error) => {

  console.error("");
  console.error("❌ Notion 동기화 실패");

  console.error(error);

  // GitHub Actions에서도 실패를 감지할 수 있도록
  // exit code 1로 종료한다.
  process.exit(1);
});
