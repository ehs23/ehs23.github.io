// Next.js의 페이지 이동용 Link 컴포넌트
import Link from "next/link";

// 우리가 posts.ts에서 만든 Post 타입을 가져온다.
import type { Post } from "@/lib/posts";


// PostFeed 컴포넌트가 받을 데이터 타입
type PostFeedProps = {
  // 블로그 게시글 배열
  posts: Post[];
};


// 날짜를 2026.08.13 형태로 보여주기 위한 함수
function formatDate(date: string) {
  // YYYY-MM-DD에서 "-"를 "."으로 변경한다.
  return date.replaceAll("-", ".");
}


// 메인 화면의 게시글 목록
export default function PostFeed({
  posts,
}: PostFeedProps) {
  return (
    <section className="post-feed">

      {/* 게시글을 하나씩 반복해서 출력 */}
      {posts.map((post) => (
        <article
          key={post.slug}
          className="post-card"
        >

          {/* 왼쪽 프로필 영역 */}
          <div className="post-avatar">
            E
          </div>


          {/* 글의 핵심 내용 */}
          <div className="post-card-content">

            {/* 작성자 / 날짜 / 카테고리 */}
            <div className="post-meta">
              <span className="post-author">
                ehs23
              </span>

              <span>·</span>

              <time>
                {formatDate(post.date)}
              </time>

              <span>·</span>

              <span>Blog</span>
            </div>


            {/* 제목을 누르면 상세 페이지로 이동 */}
            <Link
              href={`/blog/${post.slug}`}
              className="post-title-link"
            >
              <h2 className="post-title">
                {post.title}
              </h2>
            </Link>


            {/* Notion Description 속성 */}
            {post.description && (
              <p className="post-description">
                {post.description}
              </p>
            )}


            {/* 태그 */}
            <div className="post-tags">

              {/* 태그는 너무 많아지지 않도록 앞의 4개만 표시 */}
              {post.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="post-tag"
                >
                  #{tag}
                </span>
              ))}

            </div>

          </div>


          {/* 오른쪽 작은 정보 영역 */}
          <div className="post-side-info">
            태그 {post.tags.length}
          </div>

        </article>
      ))}

    </section>
  );
}