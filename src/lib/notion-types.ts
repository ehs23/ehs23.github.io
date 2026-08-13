import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client";

// Notion 공식 Block API 응답에 재귀적으로 가져온 자식만 덧붙인다.
export type NotionBlock = BlockObjectResponse & {
  children?: NotionBlock[];
};

export type NotionRichText = RichTextItemResponse;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isNotionBlockArray(
  value: unknown
): value is NotionBlock[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((block) => {
    if (
      !isRecord(block) ||
      typeof block.id !== "string" ||
      typeof block.type !== "string" ||
      !isRecord(block[block.type])
    ) {
      return false;
    }

    return (
      block.children === undefined ||
      isNotionBlockArray(block.children)
    );
  });
}
