import type { MetadataRoute } from "next";

// output: "export" 환경에서 빌드 시점에 TXT를 생성한다.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://ehs23.github.io/sitemap.xml",
  };
}
