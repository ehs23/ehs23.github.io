// Notion 공식 JavaScript SDK에서 Client와 페이지 판별 함수를 가져온다.
import { Client, isFullPage } from "@notionhq/client";

// .env.local에서 읽어온 Notion API Token을 가져온다.
const notionToken = process.env.NOTION_TOKEN;

// .env.local에서 읽어온 Blog Data Source ID를 가져온다.
const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;

// 환경변수가 제대로 설정되지 않았다면 API 요청 전에 오류를 발생시킨다.
// 토큰이 비어있는 상태로 요청해서 원인을 찾기 어려워지는 것을 막기 위함이다.
if (!notionToken) {
  throw new Error(
    "NOTION_TOKEN이 없습니다. .env.local 파일을 확인해주세요."
  );
}

// Data Source ID가 없으면 어떤 데이터베이스를 읽어야 하는지 알 수 없으므로 중단한다.
if (!dataSourceId) {
  throw new Error(
    "NOTION_DATA_SOURCE_ID가 없습니다. .env.local 파일을 확인해주세요."
  );
}

// Notion API Client를 생성한다.
// auth에는 우리가 만든 Connection의 Access Token을 사용한다.
const notion = new Client({
  auth: notionToken,

  // 현재 최신 Notion API 버전을 명시적으로 사용한다.
  notionVersion: "2026-03-11",
});

// Notion Blog 데이터베이스 연결을 테스트하는 함수
async function testNotion() {
  // ---------------------------------------------------
  // 1. Data Source 자체를 읽어본다.
  // ---------------------------------------------------

  const dataSource = await notion.dataSources.retrieve({
    // 어떤 데이터 소스를 가져올 것인지 지정한다.
    data_source_id: dataSourceId,
  });

  console.log("✅ Notion 연결 성공");
  console.log("Data Source ID:", dataSource.id);

  // 데이터베이스에 어떤 속성(column)이 존재하는지 출력한다.
  // 예: Title, Slug, Date, Tags, Description, Published
  console.log(
    "데이터베이스 속성:",
    Object.keys(dataSource.properties)
  );

  // ---------------------------------------------------
  // 2. Published가 체크된 글만 조회한다.
  // ---------------------------------------------------

  const response = await notion.dataSources.query({
    // 우리가 만든 Blog 데이터 소스
    data_source_id: dataSourceId,

    // Published 체크박스가 true인 글만 가져온다.
    filter: {
      property: "Published",

      checkbox: {
        equals: true,
      },
    },

    // 최신 글이 위로 오도록 Date를 내림차순 정렬한다.
    sorts: [
      {
        property: "Date",
        direction: "descending",
      },
    ],
  });

  console.log("");
  console.log(`✅ 공개 글 ${response.results.length}개 발견`);
  console.log("");

  // ---------------------------------------------------
  // 3. 가져온 글들의 제목을 출력한다.
  // ---------------------------------------------------

  for (const result of response.results) {
    // Notion API 결과에는 여러 객체 타입이 올 수 있으므로
    // 완전한 Page 객체인 경우에만 아래 코드를 실행한다.
    if (!isFullPage(result)) {
      continue;
    }

    // 우리가 Notion DB에서 만든 Title 속성을 가져온다.
    const titleProperty = result.properties.Title;

    // Title 속성이 실제 title 타입인지 확인한다.
    if (titleProperty?.type !== "title") {
      console.log("⚠️ Title 속성을 찾을 수 없습니다.");
      continue;
    }

    // Notion의 title은 여러 rich text 조각으로 구성될 수 있으므로
    // 모든 plain_text를 합쳐서 하나의 문자열로 만든다.
    const title = titleProperty.title
      .map((text) => text.plain_text)
      .join("");

    console.log(`📝 ${title}`);
  }
}

// 테스트를 실행한다.
testNotion().catch((error) => {
  // 오류가 발생하면 내용을 터미널에 출력한다.
  console.error("");
  console.error("❌ Notion API 테스트 실패");
  console.error(error);

  // 명령어 실행 자체도 실패 상태로 종료한다.
  process.exit(1);
});