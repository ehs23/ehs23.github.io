import type { Metadata } from "next";

// 모든 Markdown 게시글을 가져오는 함수
import { getAllPosts } from "@/lib/posts";

// 방금 만든 게시글 목록 컴포넌트
import PostFeed from "@/components/PostFeed";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};


export default function HomePage() {

  // 날짜가 최신인 순서대로 모든 글을 가져온다.
  const posts = getAllPosts();

  return (
    <main className="home-page">

      {/* 블로그 상단 영역 */}
      <header className="home-header">

        {/* 블로그 제목 */}
        <h1 className="blog-name">
          ehs23
        </h1>

        {/* 블로그에 대한 간단한 설명 */}
        <p className="blog-description">
          개발하면서 배우고 기록한 내용을 정리합니다.
        </p>

      </header>


      {/* 게시글 개수 */}
      <div className="feed-header">

        <h2>
          최근 글
        </h2>

        <span>
          {posts.length}개의 글
        </span>

      </div>


      {/* 실제 게시글 목록 */}
      <PostFeed posts={posts} />

    </main>
  );
}
