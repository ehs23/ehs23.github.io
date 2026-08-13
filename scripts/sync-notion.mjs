import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import matter from "gray-matter";
import {
  Client,
  isFullBlock,
  isFullPage,
} from "@notionhq/client";

const notionToken = process.env.NOTION_TOKEN;
const dataSourceId = process.env.NOTION_DATA_SOURCE_ID;

if (!notionToken) {
  throw new Error(
    "NOTION_TOKEN이 없습니다. .env.local 파일을 확인해주세요."
  );
}

if (!dataSourceId) {
  throw new Error(
    "NOTION_DATA_SOURCE_ID가 없습니다. .env.local 파일을 확인해주세요."
  );
}

const notion = new Client({
  auth: notionToken,
  notionVersion: "2026-03-11",
});

const projectDirectory = process.cwd();
const postsDirectory = path.join(
  projectDirectory,
  "content",
  "posts"
);
const blocksDirectory = path.join(
  projectDirectory,
  "content",
  "notion-blocks"
);
const publicDirectory = path.join(projectDirectory, "public");
const notionAssetsDirectory = path.join(
  publicDirectory,
  "notion-assets"
);
const manifestPath = path.join(
  postsDirectory,
  ".notion-sync.json"
);

const maximumAssetSize = 30 * 1024 * 1024;
const assetDownloadCache = new Map();
const assetExtensionByContentType = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
  ["application/pdf", ".pdf"],
  ["video/mp4", ".mp4"],
  ["video/webm", ".webm"],
  ["audio/mpeg", ".mp3"],
  ["audio/wav", ".wav"],
  ["audio/ogg", ".ogg"],
]);

function richTextToString(richText = []) {
  return richText
    .map((text) => text.plain_text ?? "")
    .join("");
}

function getTitle(page) {
  const property = page.properties.Title;

  return property?.type === "title"
    ? richTextToString(property.title)
    : "";
}

function getSlug(page) {
  const property = page.properties.Slug;

  if (property?.type !== "rich_text") {
    return "";
  }

  return richTextToString(property.rich_text)
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function getDescription(page) {
  const property = page.properties.Description;

  return property?.type === "rich_text"
    ? richTextToString(property.rich_text)
    : "";
}

function getDate(page) {
  const property = page.properties.Date;

  if (property?.type === "date" && property.date?.start) {
    return property.date.start.slice(0, 10);
  }

  return page.created_time.slice(0, 10);
}

function getMultiSelect(page, propertyName) {
  const property = page.properties[propertyName];

  return property?.type === "multi_select"
    ? property.multi_select.map((option) => option.name)
    : [];
}

// 이름이 ID인 Notion 고유 ID 속성만 글 정렬에 사용한다.
function getPageId(page) {
  const property = page.properties.ID;

  if (!property) {
    return null;
  }

  if (property.type !== "unique_id") {
    throw new Error(
      "ID 속성은 Notion 고유 ID(Unique ID) 타입이어야 합니다."
    );
  }

  return property.unique_id?.number ?? null;
}

function validateGeneratedFileNames(values, extension, label) {
  if (!Array.isArray(values)) {
    throw new Error(`.notion-sync.json의 ${label}가 배열이 아닙니다.`);
  }

  return values.map((fileName) => {
    if (
      typeof fileName !== "string" ||
      path.basename(fileName) !== fileName ||
      !fileName.endsWith(extension)
    ) {
      throw new Error(
        `.notion-sync.json에 잘못된 ${label} 파일명이 있습니다: ${String(fileName)}`
      );
    }

    return fileName;
  });
}

function validateAssetPaths(values) {
  if (!Array.isArray(values)) {
    throw new Error(".notion-sync.json의 assets가 배열이 아닙니다.");
  }

  return values.map((assetPath) => {
    if (
      typeof assetPath !== "string" ||
      !assetPath.startsWith("notion-assets/") ||
      path.posix.normalize(assetPath) !== assetPath ||
      assetPath.includes("..") ||
      path.posix.isAbsolute(assetPath)
    ) {
      throw new Error(
        `.notion-sync.json에 잘못된 첨부파일 경로가 있습니다: ${String(assetPath)}`
      );
    }

    return assetPath;
  });
}

async function readPreviousManifest() {
  try {
    const manifest = JSON.parse(
      await fs.readFile(manifestPath, "utf8")
    );

    return {
      files: validateGeneratedFileNames(
        manifest.files,
        ".md",
        "files"
      ),
      blockFiles: validateGeneratedFileNames(
        manifest.blockFiles ?? [],
        ".json",
        "blockFiles"
      ),
      assets: validateAssetPaths(manifest.assets ?? []),
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { files: [], blockFiles: [], assets: [] };
    }

    // rebase 충돌 표시처럼 JSON 문법이 깨진 경우에도
    // 기존 게시글을 삭제하지 않고 이번 동기화 결과로 복구한다.
    if (error instanceof SyntaxError) {
      console.warn(
        "⚠️ 손상된 .notion-sync.json을 무시하고 새로 생성합니다."
      );

      return { files: [], blockFiles: [], assets: [] };
    }

    throw error;
  }
}

async function readTextIfExists(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeTextIfChanged(filePath, contents) {
  if ((await readTextIfExists(filePath)) === contents) {
    return false;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;

  try {
    await fs.writeFile(temporaryPath, contents, "utf8");
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }

  return true;
}

async function writeBufferIfChanged(filePath, contents) {
  let currentContents = null;

  try {
    currentContents = await fs.readFile(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  if (currentContents?.equals(contents)) {
    return false;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.tmp`;

  try {
    await fs.writeFile(temporaryPath, contents);
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }

  return true;
}

function isTemporaryNotionAssetUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const hasAwsSignature = [...url.searchParams.keys()].some(
      (key) => key.toLowerCase().startsWith("x-amz-")
    );

    return (
      hasAwsSignature ||
      hostname.includes("prod-files-secure") ||
      hostname.includes("notion-static")
    );
  } catch {
    return false;
  }
}

function getAssetExtension(url, contentType) {
  const extension = path.extname(url.pathname).toLowerCase();

  if (/^\.[a-z0-9]{1,8}$/.test(extension)) {
    return extension === ".jpeg" ? ".jpg" : extension;
  }

  return (
    assetExtensionByContentType.get(
      contentType.split(";", 1)[0].toLowerCase()
    ) ?? ".bin"
  );
}

async function downloadNotionAsset(
  sourceUrl,
  slug,
  generatedAssets
) {
  const url = new URL(sourceUrl);
  const stableSource = `${url.origin}${url.pathname}`;
  const cacheKey = `${slug}:${stableSource}`;
  const cachedDownload = assetDownloadCache.get(cacheKey);

  if (cachedDownload) {
    return cachedDownload;
  }

  const download = (async () => {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Notion 첨부파일 다운로드 실패 (${response.status}): ${url.pathname}`
      );
    }

    const contentLength = Number(
      response.headers.get("content-length") ?? 0
    );

    if (contentLength > maximumAssetSize) {
      throw new Error(
        `Notion 첨부파일이 30MB를 초과합니다: ${url.pathname}`
      );
    }

    const contents = Buffer.from(await response.arrayBuffer());

    if (contents.byteLength > maximumAssetSize) {
      throw new Error(
        `Notion 첨부파일이 30MB를 초과합니다: ${url.pathname}`
      );
    }

    const extension = getAssetExtension(
      url,
      response.headers.get("content-type") ?? ""
    );
    const digest = createHash("sha256")
      .update(stableSource)
      .digest("hex")
      .slice(0, 20);
    const assetPath = `notion-assets/${slug}/${digest}${extension}`;

    generatedAssets.set(assetPath, contents);

    return `/${assetPath}`;
  })();

  assetDownloadCache.set(cacheKey, download);

  try {
    return await download;
  } catch (error) {
    assetDownloadCache.delete(cacheKey);
    throw error;
  }
}

async function localizeTypedFile(
  fileObject,
  slug,
  generatedAssets
) {
  if (
    !fileObject ||
    typeof fileObject !== "object" ||
    fileObject.type !== "file" ||
    typeof fileObject.file?.url !== "string" ||
    !isTemporaryNotionAssetUrl(fileObject.file.url)
  ) {
    return;
  }

  fileObject.file.url = await downloadNotionAsset(
    fileObject.file.url,
    slug,
    generatedAssets
  );

  // API를 호출할 때마다 바뀌는 원격 URL 만료 시각은
  // 로컬 파일로 교체한 뒤 필요 없으므로 저장하지 않는다.
  delete fileObject.file.expiry_time;
}

async function localizeBlockAssets(
  blockType,
  blockData,
  slug,
  generatedAssets
) {
  if (["image", "video", "audio", "file", "pdf"].includes(blockType)) {
    await localizeTypedFile(blockData, slug, generatedAssets);
  }

  if (blockType === "callout") {
    await localizeTypedFile(
      blockData.icon,
      slug,
      generatedAssets
    );
  }
}

async function getBlockChildren(
  parentId,
  slug,
  generatedAssets
) {
  const blocks = [];
  let cursor = undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: parentId,
      page_size: 100,
      start_cursor: cursor,
    });

    for (const result of response.results) {
      if (!isFullBlock(result)) {
        throw new Error(
          `완전한 Notion Block 데이터를 받지 못했습니다: ${result.id}`
        );
      }

      const block = structuredClone(result);
      const blockData = block[block.type];

      await localizeBlockAssets(
        result.type,
        blockData,
        slug,
        generatedAssets
      );

      if (result.has_children) {
        block.children = await getBlockChildren(
          result.id,
          slug,
          generatedAssets
        );
      }

      blocks.push(block);
    }

    cursor = response.has_more
      ? response.next_cursor
      : undefined;
  } while (cursor);

  return blocks;
}

async function getPublishedPages() {
  const pages = [];
  let cursor = undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: "Published",
        checkbox: { equals: true },
      },
      start_cursor: cursor,
    });

    pages.push(...response.results);
    cursor = response.has_more
      ? response.next_cursor
      : undefined;
  } while (cursor);

  return pages;
}

async function applyGeneratedContent(
  generatedPosts,
  generatedBlockFiles,
  generatedAssets
) {
  const previousManifest = await readPreviousManifest();
  const generatedFiles = [...generatedPosts.keys()].sort();
  const generatedBlocks = [...generatedBlockFiles.keys()].sort();
  const generatedAssetPaths = [...generatedAssets.keys()].sort();

  for (const assetPath of generatedAssetPaths) {
    await writeBufferIfChanged(
      path.join(publicDirectory, ...assetPath.split("/")),
      generatedAssets.get(assetPath)
    );
  }

  for (const blockFile of generatedBlocks) {
    await writeTextIfChanged(
      path.join(blocksDirectory, blockFile),
      generatedBlockFiles.get(blockFile)
    );
  }

  for (const fileName of generatedFiles) {
    await writeTextIfChanged(
      path.join(postsDirectory, fileName),
      generatedPosts.get(fileName)
    );
  }

  for (const fileName of previousManifest.files) {
    if (!generatedPosts.has(fileName)) {
      await fs.rm(path.join(postsDirectory, fileName), { force: true });
    }
  }

  for (const blockFile of previousManifest.blockFiles) {
    if (!generatedBlockFiles.has(blockFile)) {
      await fs.rm(path.join(blocksDirectory, blockFile), { force: true });
    }
  }

  for (const assetPath of previousManifest.assets) {
    if (!generatedAssets.has(assetPath)) {
      await fs.rm(
        path.join(publicDirectory, ...assetPath.split("/")),
        { force: true }
      );
    }
  }

  await writeTextIfChanged(
    manifestPath,
    `${JSON.stringify(
      {
        files: generatedFiles,
        blockFiles: generatedBlocks,
        assets: generatedAssetPaths,
      },
      null,
      2
    )}\n`
  );
}

async function syncNotionPosts() {
  console.log("\n🚀 Notion 블로그 동기화 시작\n");

  await Promise.all([
    fs.mkdir(postsDirectory, { recursive: true }),
    fs.mkdir(blocksDirectory, { recursive: true }),
    fs.mkdir(notionAssetsDirectory, { recursive: true }),
  ]);

  const pages = await getPublishedPages();
  const generatedPosts = new Map();
  const generatedBlockFiles = new Map();
  const generatedAssets = new Map();

  console.log(`📚 Published 글 ${pages.length}개 발견\n`);

  for (const result of pages) {
    if (!isFullPage(result)) {
      throw new Error(
        "Notion에서 완전한 Page 데이터를 받지 못했습니다."
      );
    }

    const title = getTitle(result);
    const slug = getSlug(result);

    if (!title) {
      throw new Error(`Published 글에 Title이 없습니다: ${result.id}`);
    }

    if (!slug) {
      throw new Error(`Published 글에 Slug가 없습니다: ${title}`);
    }

    const fileName = `${slug}.md`;
    const blockFileName = `${slug}.json`;

    if (
      generatedPosts.has(fileName) ||
      generatedBlockFiles.has(blockFileName)
    ) {
      throw new Error(`중복 Slug가 있습니다: ${slug}`);
    }

    const blocks = await getBlockChildren(
      result.id,
      slug,
      generatedAssets
    );
    const frontMatter = {
      title,
      date: getDate(result),
      description: getDescription(result),
      tags: getMultiSelect(result, "Tags"),
      types: getMultiSelect(result, "Types"),
      pageId: getPageId(result),
      notionPageId: result.id,
      contentFormat: "notion-blocks",
    };

    generatedPosts.set(
      fileName,
      `${matter.stringify("", frontMatter).trimEnd()}\n`
    );
    generatedBlockFiles.set(
      blockFileName,
      `${JSON.stringify(blocks, null, 2)}\n`
    );

    console.log(`✅ ${title}`);
    console.log(`   → content/notion-blocks/${blockFileName}`);
  }

  await applyGeneratedContent(
    generatedPosts,
    generatedBlockFiles,
    generatedAssets
  );

  console.log("\n🎉 Notion 동기화 완료");
}

syncNotionPosts().catch((error) => {
  console.error("\n❌ Notion 동기화 실패");
  console.error(error);
  process.exit(1);
});
