import type { ZipteriorContentBlock, ZipteriorPortfolioImage, ZipteriorPortfolioSpace } from "@/lib/types";

/**
 * 집테리어 app.js의 리치텍스트 배열({entity, content:[...]} 형태)에서
 * 순수 텍스트만 뽑아낸다. 굵게/기울임 등 서식은 생략하고 줄바꿈(<br>)만
 * "\n"으로 보존한다 — whitespace-pre-line과 함께 쓰면 원본과 같은 줄바꿈으로
 * 보인다. 서식까지 완전히 재현하려면 app.js의 cbRichHtml()처럼 각 span을
 * <b>/<i> 등으로 감싸야 하는데, 지금 요구사항(텍스트가 순서대로 보이는 것)엔
 * 과한 작업이라 의도적으로 생략했다.
 */
export function richTextToPlain(node: Record<string, unknown> | null | undefined, key: string): string {
  const arr = node?.[key];
  if (!Array.isArray(arr)) return "";
  let out = "";
  for (const span of arr) {
    if (typeof span === "string") {
      out += span;
      continue;
    }
    if (!span || typeof span !== "object") continue;
    const content = Array.isArray((span as { content?: unknown[] }).content) ? (span as { content: unknown[] }).content : [];
    for (const item of content) {
      if (typeof item === "string") {
        out += item;
      } else if (item && typeof item === "object") {
        const record = item as { type?: string; content?: string; text?: string };
        if (record.type === "br") out += "\n";
        else out += record.content || record.text || "";
      }
    }
  }
  return out;
}

export interface RoomGroup {
  key: string;
  name: string;
  description: string | null;
  images: { src: string; caption: string | null }[];
}

/**
 * 집테리어 app.js의 openPortfolioDetail() 방(공간)별 그룹핑 로직과 동일 —
 * portfolio_space_id가 spaces 목록과 매칭되면 그 공간으로, 아니면
 * room_label로 대체 그룹핑한다.
 */
export function groupImagesBySpace(
  images: ZipteriorPortfolioImage[],
  spaces: ZipteriorPortfolioSpace[],
): RoomGroup[] {
  const spaceGroups = new Map<string, RoomGroup>(
    spaces.map((space) => [
      space.id,
      { key: `space-${space.id}`, name: space.name, description: space.description, images: [] },
    ]),
  );
  const fallback = new Map<string, RoomGroup>();

  for (const image of images) {
    if (image.space_id && spaceGroups.has(image.space_id)) {
      spaceGroups.get(image.space_id)!.images.push({ src: image.src, caption: image.caption });
      continue;
    }
    const name = image.room_label || "기타";
    if (!fallback.has(name)) {
      fallback.set(name, { key: `room-${name}`, name, description: null, images: [] });
    }
    fallback.get(name)!.images.push({ src: image.src, caption: image.caption });
  }

  return [...spaceGroups.values(), ...fallback.values()].filter((room) => room.images.length > 0);
}

/**
 * 집테리어 app.js의 renderContentBlock()과 동일한 block_type 스위치.
 * link 블록(SNS/블로그 링크)은 관리자 설정(sns_links_enabled)이 우리
 * 쪽엔 없어 항상 생략 — 문서 순서상 부가 정보라 빠져도 핵심 내용
 * (텍스트+사진 순서)에는 영향 없음.
 */
export function ContentBlockView({ block, imageIndex }: { block: ZipteriorContentBlock; imageIndex: number }) {
  const type = (block.block_type || "").toLowerCase();
  const node = block.raw_node;

  if (type === "image") {
    if (!block.image_url) return null;
    const caption = richTextToPlain(node, "caption");
    return (
      <figure className="m-0 flex flex-col gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.image_url} alt="" loading="lazy" data-lightbox-index={imageIndex} className="w-full rounded-xl object-cover" />
        {caption && <figcaption className="whitespace-pre-line text-[11px] text-muted">{caption}</figcaption>}
      </figure>
    );
  }

  if (type === "heading") {
    const text = richTextToPlain(node, "text") || block.text_content || "";
    if (!text) return null;
    return <h3 className="text-base font-extrabold text-ink">{text}</h3>;
  }

  if (type === "callout") {
    const title = richTextToPlain(node, "titleText");
    const body = richTextToPlain(node, "text");
    if (!title && !body) return null;
    return (
      <div className="rounded-xl border border-line bg-soft px-4 py-3">
        {title && <p className="text-sm font-bold text-brand-green">{title}</p>}
        {body && <p className="mt-1 whitespace-pre-line text-sm text-ink/80">{body}</p>}
      </div>
    );
  }

  if (type === "divider") {
    return <hr className="border-line" />;
  }

  if (type === "link") {
    return null;
  }

  const text = richTextToPlain(node, "text") || block.text_content || "";
  if (!text) return null;
  return <p className="whitespace-pre-line text-sm leading-relaxed text-ink/80">{text}</p>;
}
