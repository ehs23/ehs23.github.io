import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main>
      <h1>Blog</h1>

      {posts.map((post) => (
        <article key={post.slug}>
          <Link href={`/blog/${post.slug}`}>
            <h2>{post.title}</h2>
          </Link>

          <p>{post.date}</p>

          <p>{post.description}</p>

          <div>
            {post.tags.map((tag) => (
              <span key={tag}>#{tag} </span>
            ))}
          </div>
        </article>
      ))}
    </main>
  );
}