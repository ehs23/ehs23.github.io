// 전체 게시글 목록을 가져온다.
import { getAllPosts } from "@/lib/posts";

// 메인 페이지와 동일한 피드를 사용한다.
import PostFeed from "@/components/PostFeed";


export default function BlogPage() {

  // 모든 게시글 가져오기
  const posts = getAllPosts();

  return (
    <main className="home-page">

      {/* Blog 페이지 제목 */}
      <header className="home-header">

        <h1 className="blog-name">
          Blog
        </h1>

        <p className="blog-description">
          개발과 공부 기록을 모아둔 공간입니다.
        </p>

      </header>


      {/* 게시글 목록 */}
      <PostFeed posts={posts} />

    </main>
  );
}