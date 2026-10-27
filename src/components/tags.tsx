import { Tag as TagIcon } from "lucide-react";
import { useData } from "../store/data";
import { useUi } from "../store/ui";
import { cn, darken } from "../lib/utils";
import type { Tag } from "../types";

export function TagPill({ tag, className }: { tag: Tag | null; className?: string }) {
  if (!tag) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
        className,
      )}
      style={{ color: darken(tag.color), backgroundColor: `${tag.color}1f` }}
    >
      <TagIcon className="h-2.5 w-2.5" />
      {tag.name}
    </span>
  );
}

/** Thanh lọc theo nhiều tag (chọn nhiều = hiện mục thuộc bất kỳ tag nào). */
export function TagFilter({ className }: { className?: string }) {
  const tags = useData((s) => s.data.tags);
  const filter = useUi((s) => s.tagFilter);
  const toggleTag = useUi((s) => s.toggleTag);
  const clearTags = useUi((s) => s.clearTags);

  if (tags.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <button
        onClick={clearTags}
        className={cn(
          "h-7 rounded-lg border px-2.5 text-[12px] font-medium transition-colors",
          filter.length === 0
            ? "border-accent/30 bg-slate-100 text-fg"
            : "border-line bg-slate-50 text-muted hover:text-fg",
        )}
      >
        Tất cả
      </button>
      {tags.map((t) => {
        const active = filter.includes(t.id);
        return (
          <button
            key={t.id}
            onClick={() => toggleTag(t.id)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors",
              active ? "border-transparent" : "border-line bg-slate-50 text-muted hover:text-fg",
            )}
            style={
              active
                ? { borderColor: `${t.color}66`, backgroundColor: `${t.color}26`, color: darken(t.color) }
                : undefined
            }
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: t.color }}
            />
            {t.name}
          </button>
        );
      })}
    </div>
  );
}
