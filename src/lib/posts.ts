import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "content/posts");

export type Post = {
  slug: string;
  title: string;
  date: string;
  description: string;
  tags: string[];
  types: string[];
};

export type PostWithContent = Post & {
  content: string;
};

// 한 번 읽은 글은 빌드 과정에서 다시 파싱하지 않는다.
const postCache = new Map<string, PostWithContent>();

function requireString(
  value: unknown,
  fieldName: string,
  slug: string
) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(
      `${slug}.md의 ${fieldName} 값은 비어 있지 않은 문자열이어야 합니다.`
    );
  }

  return value.trim();
}

function normalizeDate(value: unknown, slug: string) {
  const date =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : requireString(value, "date", slug);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(
      `${slug}.md의 date는 YYYY-MM-DD 형식이어야 합니다.`
    );
  }

  return date;
}

function normalizeStringArray(value: unknown) {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error("tags와 types 값은 문자열 배열이어야 합니다.");
  }

  const values = value.map((item) => {
    if (typeof item !== "string") {
      throw new Error("tags와 types에는 문자열만 사용할 수 있습니다.");
    }

    return item.trim();
  });

  return [...new Set(values.filter(Boolean))];
}

function readPost(slug: string): PostWithContent {
  if (
    path.basename(slug) !== slug ||
    slug.includes("..")
  ) {
    throw new Error(`잘못된 게시글 Slug입니다: ${slug}`);
  }

  const cachedPost = postCache.get(slug);

  if (cachedPost) {
    return cachedPost;
  }

  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const title = requireString(data.title, "title", slug);
  const date = normalizeDate(data.date, slug);

  const post: PostWithContent = {
    slug,
    title,
    date,
    description:
      typeof data.description === "string"
        ? data.description.trim()
        : "",
    tags: normalizeStringArray(data.tags),
    types: normalizeStringArray(data.types),
    content,
  };

  postCache.set(slug, post);

  return post;
}

export function getAllPosts(): Post[] {
  const fileNames = fs
    .readdirSync(postsDirectory)
    .filter((fileName) => fileName.endsWith(".md"));

  const posts = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.md$/, "");
    const post = readPost(slug);

    return {
      slug: post.slug,
      title: post.title,
      date: post.date,
      description: post.description,
      tags: post.tags,
      types: post.types,
    };
  });

  return posts.sort((a, b) => {
    const dateDifference = b.date.localeCompare(a.date);

    return dateDifference || a.slug.localeCompare(b.slug);
  });
}

export function getPost(slug: string): PostWithContent {
  return readPost(slug);
}
