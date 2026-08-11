import { cn } from "@/lib/utils";
import type { Priority } from "@/data/tasks";

const labels: Record<Priority, string> = {
  high: "High Priority",
  medium: "Medium",
  low: "Low",
};

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
        priority === "high" && "bg-primary/12 text-primary",
        priority === "medium" && "bg-accent text-accent-foreground",
        priority === "low" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          priority === "high" && "bg-primary",
          priority === "medium" && "bg-primary/50",
          priority === "low" && "bg-muted-foreground/60",
        )}
      />
      {labels[priority]}
    </span>
  );
}
