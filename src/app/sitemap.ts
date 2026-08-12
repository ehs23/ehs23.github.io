import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/posts";

const siteUrl = "https://ehs23.github.io";

// output: "export" 환경에서 빌드 시점에 XML을 생성한다.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const postEntries = getAllPosts().map((post) => ({
    url: `${siteUrl}/blog/${post.slug}/`,
    lastModified: post.date,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: `${siteUrl}/`,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/blog/`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...postEntries,
  ];
}
