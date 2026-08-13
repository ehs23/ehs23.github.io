/* eslint-disable @next/next/no-img-element */
import katex from "katex";
import type { ReactNode } from "react";
import type {
  NotionBlock,
  NotionRichText,
} from "@/lib/notion-types";

type NotionBlocksProps = {
  blocks: NotionBlock[];
  headings?: HeadingInfo[];
};

type HeadingInfo = {
  id: string;
  level: number;
  title: string;
};

const supportedColors = new Set([
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
  "gray_background",
  "brown_background",
  "orange_background",
  "yellow_background",
  "green_background",
  "blue_background",
  "purple_background",
  "pink_background",
  "red_background",
]);

function colorClass(color?: string) {
  return color && supportedColors.has(color)
    ? `notion-color-${color.replace("_background", "-background")}`
    : undefined;
}

function safeUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value.startsWith("/") || value.startsWith("#")) {
    return value;
  }

  try {
    const url = new URL(value);

    return ["http:", "https:", "mailto:", "tel:"].includes(
      url.protocol
    )
      ? value
      : null;
  } catch {
    return null;
  }
}

function renderEquation(expression: string, displayMode: boolean) {
  try {
    return {
      __html: katex.renderToString(expression, {
        displayMode,
        throwOnError: false,
        trust: false,
        strict: "ignore",
      }),
    };
  } catch {
    return { __html: "" };
  }
}

function RichTextItem({
  item,
  index,
}: {
  item: NotionRichText;
  index: number;
}) {
  let content: ReactNode;

  if (item.type === "equation") {
    content = (
      <span
        className="notion-inline-equation"
        dangerouslySetInnerHTML={renderEquation(
          item.equation.expression,
          false
        )}
      />
    );
  } else {
    content = item.plain_text;
  }

  if (item.annotations.code) {
    content = <code>{content}</code>;
  }

  if (item.annotations.bold) {
    content = <strong>{content}</strong>;
  }

  if (item.annotations.italic) {
    content = <em>{content}</em>;
  }

  if (item.annotations.strikethrough) {
    content = <s>{content}</s>;
  }

  if (item.annotations.underline) {
    content = <u>{content}</u>;
  }

  const textColorClass = colorClass(item.annotations.color);

  if (textColorClass) {
    content = <span className={textColorClass}>{content}</span>;
  }

  const href = safeUrl(item.href);

  if (href) {
    content = <a href={href}>{content}</a>;
  }

  return <span key={index}>{content}</span>;
}

function RichText({ richText }: { richText: NotionRichText[] }) {
  return richText.map((item, index) => (
    <RichTextItem
      key={`${index}-${item.plain_text}`}
      item={item}
      index={index}
    />
  ));
}

function plainText(richText: NotionRichText[] = []) {
  return richText.map((item) => item.plain_text).join("");
}

function getMediaUrl(media: {
  type: "file" | "external";
  file?: { url: string };
  external?: { url: string };
}) {
  return safeUrl(
    media.type === "file"
      ? media.file?.url
      : media.external?.url
  );
}

function NotionIcon({
  icon,
}: {
  icon: Record<string, unknown> | null;
}) {
  if (!icon || typeof icon.type !== "string") {
    return null;
  }

  if (icon.type === "emoji" && typeof icon.emoji === "string") {
    return <span aria-hidden="true">{icon.emoji}</span>;
  }

  const source =
    icon.type === "file" &&
    typeof icon.file === "object" &&
    icon.file !== null &&
    "url" in icon.file &&
    typeof icon.file.url === "string"
      ? safeUrl(icon.file.url)
      : icon.type === "external" &&
          typeof icon.external === "object" &&
          icon.external !== null &&
          "url" in icon.external &&
          typeof icon.external.url === "string"
        ? safeUrl(icon.external.url)
        : icon.type === "custom_emoji" &&
            typeof icon.custom_emoji === "object" &&
            icon.custom_emoji !== null &&
            "url" in icon.custom_emoji &&
            typeof icon.custom_emoji.url === "string"
          ? safeUrl(icon.custom_emoji.url)
          : null;

  return source ? (
    <img
      className="notion-block-icon"
      src={source}
      alt=""
    />
  ) : null;
}

function ChildBlocks({
  blocks,
  headings,
}: {
  blocks?: NotionBlock[];
  headings: HeadingInfo[];
}) {
  return blocks?.length ? (
    <div className="notion-block-children">
      <NotionBlocks blocks={blocks} headings={headings} />
    </div>
  ) : null;
}

function headingId(blockId: string) {
  return `notion-${blockId}`;
}

function getHeadingData(
  block: Extract<
    NotionBlock,
    {
      type:
        | "heading_1"
        | "heading_2"
        | "heading_3"
        | "heading_4";
    }
  >
) {
  switch (block.type) {
    case "heading_1":
      return block.heading_1;
    case "heading_2":
      return block.heading_2;
    case "heading_3":
      return block.heading_3;
    case "heading_4":
      return block.heading_4;
  }
}

function collectHeadings(blocks: NotionBlock[]): HeadingInfo[] {
  const headings: HeadingInfo[] = [];

  for (const block of blocks) {
    if (
      block.type === "heading_1" ||
      block.type === "heading_2" ||
      block.type === "heading_3" ||
      block.type === "heading_4"
    ) {
      const level = Number(block.type.at(-1));
      const title = plainText(getHeadingData(block).rich_text);

      if (title) {
        headings.push({
          id: headingId(block.id),
          level,
          title,
        });
      }
    }

    if (block.children?.length) {
      headings.push(...collectHeadings(block.children));
    }
  }

  return headings;
}

function HeadingBlock({
  block,
  headings,
}: {
  block: Extract<
    NotionBlock,
    {
      type:
        | "heading_1"
        | "heading_2"
        | "heading_3"
        | "heading_4";
    }
  >;
  headings: HeadingInfo[];
}) {
  const data = getHeadingData(block);
  const id = headingId(block.id);
  const className = colorClass(data.color);
  const content = <RichText richText={data.rich_text} />;
  const heading =
    block.type === "heading_1" ? (
      <h1 id={id} className={className}>{content}</h1>
    ) : block.type === "heading_2" ? (
      <h2 id={id} className={className}>{content}</h2>
    ) : block.type === "heading_3" ? (
      <h3 id={id} className={className}>{content}</h3>
    ) : (
      <h4 id={id} className={className}>{content}</h4>
    );

  if (!data.is_toggleable) {
    return heading;
  }

  return (
    <details className="notion-toggle notion-heading-toggle">
      <summary>{heading}</summary>
      <ChildBlocks blocks={block.children} headings={headings} />
    </details>
  );
}

function ListRun({
  blocks,
  headings,
}: {
  blocks: NotionBlock[];
  headings: HeadingInfo[];
}) {
  const isNumbered = blocks[0].type === "numbered_list_item";
  const first = blocks[0];
  const start =
    first.type === "numbered_list_item"
      ? first.numbered_list_item.list_start_index
      : undefined;
  const format =
    first.type === "numbered_list_item"
      ? first.numbered_list_item.list_format
      : undefined;
  const className = format
    ? `notion-list-${format}`
    : undefined;
  const items = blocks.map((block) => {
    const data =
      block.type === "numbered_list_item"
        ? block.numbered_list_item
        : block.type === "bulleted_list_item"
          ? block.bulleted_list_item
          : null;

    if (!data) {
      return null;
    }

    return (
      <li key={block.id} className={colorClass(data.color)}>
        <RichText richText={data.rich_text} />
        <ChildBlocks blocks={block.children} headings={headings} />
      </li>
    );
  });

  return isNumbered ? (
    <ol start={start} className={className}>{items}</ol>
  ) : (
    <ul>{items}</ul>
  );
}

function TableBlock({
  block,
}: {
  block: Extract<NotionBlock, { type: "table" }>;
}) {
  const rows = (block.children ?? []).filter(
    (child) => child.type === "table_row"
  );

  return (
    <div className="notion-table-scroll">
      <table>
        <tbody>
          {rows.map((row, rowIndex) => {
            if (row.type !== "table_row") {
              return null;
            }

            return (
              <tr key={row.id}>
                {row.table_row.cells.map((cell, columnIndex) => {
                  const HeaderTag =
                    (block.table.has_column_header && rowIndex === 0) ||
                    (block.table.has_row_header && columnIndex === 0)
                      ? "th"
                      : "td";

                  return (
                    <HeaderTag key={columnIndex}>
                      <RichText richText={cell} />
                    </HeaderTag>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BlockRenderer({
  block,
  headings,
}: {
  block: NotionBlock;
  headings: HeadingInfo[];
}) {
  switch (block.type) {
    case "paragraph": {
      const { paragraph } = block;

      if (!paragraph.rich_text.length && !block.children?.length) {
        return <div className="notion-empty-block" aria-hidden="true" />;
      }

      return (
        <div className={colorClass(paragraph.color)}>
          <p>
            <NotionIcon icon={paragraph.icon} />
            <RichText richText={paragraph.rich_text} />
          </p>
          <ChildBlocks blocks={block.children} headings={headings} />
        </div>
      );
    }

    case "heading_1":
    case "heading_2":
    case "heading_3":
    case "heading_4":
      return <HeadingBlock block={block} headings={headings} />;

    case "quote":
      return (
        <blockquote className={colorClass(block.quote.color)}>
          <RichText richText={block.quote.rich_text} />
          <ChildBlocks blocks={block.children} headings={headings} />
        </blockquote>
      );

    case "callout":
      return (
        <aside
          className={`notion-callout ${colorClass(block.callout.color) ?? ""}`}
        >
          <div className="notion-callout-icon">
            <NotionIcon icon={block.callout.icon} />
          </div>
          <div className="notion-callout-content">
            <p><RichText richText={block.callout.rich_text} /></p>
            <ChildBlocks blocks={block.children} headings={headings} />
          </div>
        </aside>
      );

    case "to_do":
      return (
        <div className={`notion-to-do ${colorClass(block.to_do.color) ?? ""}`}>
          <input
            type="checkbox"
            checked={block.to_do.checked}
            readOnly
            aria-label={block.to_do.checked ? "완료" : "미완료"}
          />
          <div>
            <RichText richText={block.to_do.rich_text} />
            <ChildBlocks blocks={block.children} headings={headings} />
          </div>
        </div>
      );

    case "toggle":
      return (
        <details className={`notion-toggle ${colorClass(block.toggle.color) ?? ""}`}>
          <summary><RichText richText={block.toggle.rich_text} /></summary>
          <ChildBlocks blocks={block.children} headings={headings} />
        </details>
      );

    case "code": {
      const code = plainText(block.code.rich_text);

      return (
        <figure className="notion-code">
          <pre><code className={`language-${block.code.language}`}>{code}</code></pre>
          {block.code.caption.length > 0 && (
            <figcaption><RichText richText={block.code.caption} /></figcaption>
          )}
        </figure>
      );
    }

    case "equation":
      return (
        <div
          className="notion-equation"
          dangerouslySetInnerHTML={renderEquation(
            block.equation.expression,
            true
          )}
        />
      );

    case "divider":
      return <hr />;

    case "image": {
      const source = getMediaUrl(block.image);
      const caption = plainText(block.image.caption);

      return source ? (
        <figure className="notion-image">
          <img src={source} alt={caption || "Notion 이미지"} />
          {block.image.caption.length > 0 && (
            <figcaption><RichText richText={block.image.caption} /></figcaption>
          )}
        </figure>
      ) : null;
    }

    case "video": {
      const source = getMediaUrl(block.video);

      return source ? (
        <figure className="notion-media">
          {source.startsWith("/") ? (
            <video src={source} controls preload="metadata" />
          ) : (
            <a href={source}>동영상 열기</a>
          )}
          {block.video.caption.length > 0 && (
            <figcaption><RichText richText={block.video.caption} /></figcaption>
          )}
        </figure>
      ) : null;
    }

    case "audio": {
      const source = getMediaUrl(block.audio);

      return source ? (
        <figure className="notion-media">
          <audio src={source} controls preload="metadata" />
          {block.audio.caption.length > 0 && (
            <figcaption><RichText richText={block.audio.caption} /></figcaption>
          )}
        </figure>
      ) : null;
    }

    case "file":
    case "pdf": {
      const media = block.type === "file" ? block.file : block.pdf;
      const source = getMediaUrl(media);
      const label =
        block.type === "file"
          ? block.file.name || plainText(block.file.caption) || "파일 다운로드"
          : plainText(block.pdf.caption) || "PDF 열기";

      return source ? (
        <a className="notion-file" href={source}>📎 {label}</a>
      ) : null;
    }

    case "bookmark":
    case "embed": {
      const media = block.type === "bookmark" ? block.bookmark : block.embed;
      const source = safeUrl(media.url);
      const caption = plainText(media.caption);

      return source ? (
        <a className="notion-bookmark" href={source}>
          <strong>{caption || source}</strong>
          {caption && <span>{source}</span>}
        </a>
      ) : null;
    }

    case "link_preview": {
      const source = safeUrl(block.link_preview.url);
      return source ? (
        <a className="notion-bookmark" href={source}>{source}</a>
      ) : null;
    }

    case "table":
      return <TableBlock block={block} />;

    case "table_row":
      return null;

    case "column_list":
      return (
        <div className="notion-columns">
          {(block.children ?? []).map((column) => (
            <div
              className="notion-column"
              key={column.id}
              style={
                column.type === "column" && column.column.width_ratio
                  ? { flex: column.column.width_ratio }
                  : undefined
              }
            >
              <NotionBlocks
                blocks={column.children ?? []}
                headings={headings}
              />
            </div>
          ))}
        </div>
      );

    case "column":
    case "synced_block":
    case "template":
    case "tab":
    case "meeting_notes":
    case "transcription":
      return <NotionBlocks blocks={block.children ?? []} headings={headings} />;

    case "table_of_contents":
      return headings.length ? (
        <nav className="notion-table-of-contents" aria-label="목차">
          {headings.map((heading) => (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
            >
              {heading.title}
            </a>
          ))}
        </nav>
      ) : null;

    case "child_page":
      return (
        <div className="notion-page-reference">
          📄 {block.child_page.title}
        </div>
      );

    case "child_database":
      return (
        <div className="notion-page-reference">
          🗃️ {block.child_database.title}
        </div>
      );

    case "link_to_page":
      return (
        <div className="notion-page-reference">🔗 Notion 페이지</div>
      );

    case "breadcrumb":
      return null;

    case "unsupported":
      return (
        <aside className="notion-unsupported">
          지원되지 않는 Notion 블록: {block.unsupported.block_type}
        </aside>
      );

    default:
      return (
        <aside className="notion-unsupported">
          아직 표시 방법이 없는 Notion 블록
        </aside>
      );
  }
}

export default function NotionBlocks({
  blocks,
  headings: providedHeadings,
}: NotionBlocksProps) {
  const headings = providedHeadings ?? collectHeadings(blocks);
  const rendered: ReactNode[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (
      block.type === "bulleted_list_item" ||
      block.type === "numbered_list_item"
    ) {
      const listType = block.type;
      const listBlocks: NotionBlock[] = [block];

      while (blocks[index + 1]?.type === listType) {
        listBlocks.push(blocks[index + 1]);
        index += 1;
      }

      rendered.push(
        <ListRun
          key={block.id}
          blocks={listBlocks}
          headings={headings}
        />
      );
      continue;
    }

    rendered.push(
      <BlockRenderer
        key={block.id}
        block={block}
        headings={headings}
      />
    );
  }

  return rendered;
}
