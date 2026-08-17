import { Link2 } from "lucide-react";
import { PriorityBadge } from "./PriorityBadge";
import { AvatarStack } from "./AvatarStack";
import type { Task } from "@/data/tasks";

export function TaskCard({
  task,
  dependencyTitle,
  onOpen,
}: {
  task: Task;
  dependencyTitle?: string | undefined;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="neu-raised neu-lift w-full rounded-2xl p-4 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold leading-snug text-foreground">{task.title}</h3>
      </div>
      <div className="mt-3">
        <PriorityBadge priority={task.priority} />
      </div>
      {dependencyTitle && (
        <p className="mt-3 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-[11px] text-muted-foreground">
          <Link2 className="size-3 shrink-0" />
          <span className="truncate">Depends on: {dependencyTitle}</span>
        </p>
      )}
      {task.is_dependency_readonly && (
        <div className="mt-2 inline-block rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive uppercase tracking-wide">
          Read-Only Dependency
        </div>
      )}
      {!task.is_dependency_readonly && task.sourceType === "issue" && (
        <div className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wide">
          From Issue #{task.sourceId}
        </div>
      )}
      {!task.is_dependency_readonly && task.assignorEmail && !task.sourceType && (
        <div className="mt-2 inline-block rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary-foreground uppercase tracking-wide">
          Assigned by {task.assignorEmail.split('@')[0]}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-3">
        <AvatarStack ids={task.assigneeIds} />
        <span className="text-[11px] font-medium text-muted-foreground">
          {task.is_dependency_readonly ? "Dependency" : (task.due ? (
            <>Due {new Date(task.due).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</>
          ) : (
            "No due date"
          ))}
        </span>
      </div>
    </button>
  );
}
