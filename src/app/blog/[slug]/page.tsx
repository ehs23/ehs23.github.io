import ReactMarkdown from "react-markdown";
import { getAllPosts, getPost } from "@/lib/posts";

export function generateStaticParams() {
  const posts = getAllPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);

  return (
    <main>
      <h1>{post.title}</h1>

      <p>{post.date}</p>

      <div>
        {post.tags.map((tag: string) => (
          <span key={tag}>#{tag} </span>
        ))}
      </div>

      <hr />

      <ReactMarkdown>{post.content}</ReactMarkdown>
    </main>
  );
}