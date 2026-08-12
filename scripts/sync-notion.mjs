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
    .replace(/\s+/g, "-")
    .replace(/[\\/]/g, "-");
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
    return property.date.start;
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
// 6. 이전에 Notion이 자동 생성했던 파일 삭제
// ============================================================

async function removePreviouslyGeneratedPosts() {
  try {
    // 이전 sync 결과 파일을 읽는다.
    const manifestText = await fs.readFile(
      manifestPath,
      "utf8"
    );

    const manifest = JSON.parse(manifestText);

    // 예전에 생성했던 Markdown 파일을 하나씩 삭제한다.
    for (const fileName of manifest.files ?? []) {
      // 파일 이름만 가져와서
      // 상위 경로로 빠져나가는 문제를 막는다.
      const safeFileName = path.basename(fileName);

      const filePath = path.join(
        postsDirectory,
        safeFileName
      );

      // 파일이 없어도 오류 없이 넘어간다.
      await fs.rm(filePath, {
        force: true,
      });
    }
  } catch (error) {
    // 처음 실행하면 manifest 자체가 없기 때문에
    // 오류가 나도 그냥 넘어간다.
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
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


  // 이전에 Notion에서 만든 파일들을 제거한다.
  //
  // 우리가 직접 만든 hello-world.md 같은 파일은
  // manifest에 들어있지 않기 때문에 삭제되지 않는다.
  await removePreviouslyGeneratedPosts();


  // Published = true인 글들을 가져온다.
  const pages = await getPublishedPages();

  console.log(
    `📚 Published 글 ${pages.length}개 발견`
  );

  console.log("");


  // 이번 실행에서 만들어진 파일들을 기록한다.
  const generatedFiles = [];


  // ==========================================================
  // 각각의 Notion 페이지를 Markdown으로 변환
  // ==========================================================

  for (const result of pages) {

    // API 결과가 실제 Page 객체인지 확인한다.
    if (!isFullPage(result)) {
      continue;
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


    // Slug가 없으면 파일 이름을 만들 수 없으므로 건너뛴다.
    if (!slug) {
      console.warn(
        `⚠️ Slug가 없어서 건너뜀: ${title}`
      );

      continue;
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


    // 아주 큰 페이지라서 일부 내용이 잘렸다면 경고한다.
    if (markdownResponse.truncated) {
      console.warn(
        `⚠️ 내용이 일부 잘렸을 수 있습니다: ${title}`
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


    const filePath = path.join(
      postsDirectory,
      fileName
    );


    // Markdown 파일 생성
    await fs.writeFile(
      filePath,
      fileContents,
      "utf8"
    );


    // manifest에 기록
    generatedFiles.push(fileName);


    console.log(
      `✅ ${title}`
    );

    console.log(
      `   → content/posts/${fileName}`
    );
  }


  // ==========================================================
  // 9. 이번에 생성한 파일 목록 저장
  // ==========================================================

  await fs.writeFile(
    manifestPath,

    JSON.stringify(
      {
        files: generatedFiles,

        // 마지막 동기화 시간
        syncedAt: new Date().toISOString(),
      },

      null,

      2
    ),

    "utf8"
  );


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