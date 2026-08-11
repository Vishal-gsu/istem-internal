import { cn } from "@/lib/utils";

export type ViewKey = "kanban" | "tree" | "timeline";

const views: { key: ViewKey; label: string }[] = [
  { key: "kanban", label: "Kanban Board" },
  { key: "tree", label: "Task Tree" },
  { key: "timeline", label: "Timeline" },
];

export function ViewToggle({
  value,
  onChange,
}: {
  value: ViewKey;
  onChange: (v: ViewKey) => void;
}) {
  return (
    <div className="neu-inset flex w-full gap-1 rounded-2xl p-1.5 sm:w-auto">
      {views.map((v) => (
        <button
          key={v.key}
          type="button"
          onClick={() => onChange(v.key)}
          className={cn(
            "neu-press flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:flex-none sm:px-4 sm:text-sm",
            value === v.key ? "neu-raised text-primary" : "text-muted-foreground",
          )}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
