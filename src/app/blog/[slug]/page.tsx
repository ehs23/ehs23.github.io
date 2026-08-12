// 홈으로 돌아가기 위한 Link
import Link from "next/link";

// Markdown 본문을 React 화면으로 변환
import ReactMarkdown from "react-markdown";

// 게시글 데이터 함수
import {
  getAllPosts,
  getPost,
} from "@/lib/posts";


// ----------------------------------------------------------
// GitHub Pages는 서버에서 동적으로 페이지를 생성할 수 없으므로
// 빌드할 때 모든 slug의 HTML 페이지를 미리 생성한다.
// ----------------------------------------------------------

export function generateStaticParams() {

  // 모든 게시글 목록 가져오기
  const posts = getAllPosts();

  // hello-world.md
  //
  // ↓
  //
  // { slug: "hello-world" }
  //
  // 형태로 Next.js에 알려준다.
  return posts.map((post) => ({
    slug: post.slug,
  }));
}


// 날짜 표시용 함수
function formatDate(date: string) {

  // 2026-08-13
  //
  // ↓
  //
  // 2026/08/13
  return date.replaceAll("-", "/");
}


// ----------------------------------------------------------
// 게시글 상세 페이지
// ----------------------------------------------------------

export default async function PostPage({
  params,
}: {
  // Next.js 16의 Dynamic Route params
  params: Promise<{
    slug: string;
  }>;
}) {

  // URL에서 slug를 가져온다.
  const { slug } = await params;

  // slug에 해당하는 Markdown 파일 읽기
  const post = getPost(slug);


  return (
    <main className="notion-page">

      {/* --------------------------------------------- */}
      {/* 홈으로 돌아가기 */}
      {/* --------------------------------------------- */}

      <Link
        href="/"
        className="back-link"
      >
        ← Blog
      </Link>


      {/* --------------------------------------------- */}
      {/* Notion처럼 크게 표시되는 제목 */}
      {/* --------------------------------------------- */}

      <header className="notion-header">

        <h1 className="notion-title">
          {post.title}
        </h1>


        {/* ------------------------------------------- */}
        {/* Notion 데이터베이스 Property 느낌 */}
        {/* ------------------------------------------- */}

        <div className="notion-properties">


          {/* Date */}
          <div className="property-row">

            <div className="property-name">
              <span className="property-icon">
                ◫
              </span>

              Date
            </div>

            <div className="property-value">
              {formatDate(post.date)}
            </div>

          </div>


          {/* Slug */}
          <div className="property-row">

            <div className="property-name">
              <span className="property-icon">
                ≡
              </span>

              Slug
            </div>

            <div className="property-value">
              {post.slug}
            </div>

          </div>


          {/* Tags */}
          <div className="property-row">

            <div className="property-name">
              <span className="property-icon">
                #
              </span>

              Tags
            </div>

            <div className="property-value property-tags">

              {post.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="notion-tag"
                >
                  {tag}
                </span>
              ))}

            </div>

          </div>


          {/* Types */}
          <div className="property-row">
            <div className="property-name">
              <span className="property-icon">▣</span>
              Types
            </div>

            <div className="property-value property-tags">
              {post.types.map((type: string) => (
                <span
                  key={type}
                  className="notion-tag"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>


          {/* Description */}
          <div className="property-row">

            <div className="property-name">
              <span className="property-icon">
                ☰
              </span>

              Description
            </div>

            <div className="property-value">
              {post.description}
            </div>

          </div>

        </div>

      </header>


      {/* Notion의 Property와 본문 사이 구분선 */}
      <div className="notion-divider" />


      {/* --------------------------------------------- */}
      {/* Markdown 본문 */}
      {/* --------------------------------------------- */}

      <article className="markdown-body">

        <ReactMarkdown>
          {post.content}
        </ReactMarkdown>

      </article>

    </main>
  );
}