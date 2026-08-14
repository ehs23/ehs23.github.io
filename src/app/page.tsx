import type { Metadata } from "next";

// 모든 Markdown 게시글을 가져오는 함수
import { getAllPosts } from "@/lib/posts";

// 방금 만든 게시글 목록 컴포넌트
import PostFeed from "@/components/PostFeed";

import Image from "next/image";
import giphy from "@/components/giphy.gif";

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
        <Image
          src={giphy}
          alt="TAF 캐릭터"
          className="blog-title-gif"
          unoptimized
          priority
        />

        <h1 className="blog-name">TAF : ehs23</h1>

        <p className="blog-description">
          나의 개발 및 학습을 기록하도록 만든 자작 사이트입니다.
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
