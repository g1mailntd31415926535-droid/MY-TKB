import type { Tag } from "../../types";

export const NEW_TAG = "__new__";

/** Gắn nhóm mặc định khi tạo mới (để chấm đúng màu ngay từ đầu). */
export function tagIdByName(tags: Tag[], name: string): string | null {
  return tags.find((t) => t.name.toLowerCase() === name.toLowerCase())?.id ?? null;
}
