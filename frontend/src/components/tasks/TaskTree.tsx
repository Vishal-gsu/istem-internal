import { ChevronDown, ChevronRight, Ban } from "lucide-react";
import { useState } from "react";
import { PriorityBadge } from "./PriorityBadge";
import { AvatarStack } from "./AvatarStack";
import { statusLabels, type Task } from "@/data/tasks";
import { cn } from "@/lib/utils";

function StatusPill({ status }: { status: Task["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
        status === "done" && "bg-muted text-muted-foreground",
        status === "in-progress" && "bg-primary/12 text-primary",
        status === "todo" && "neu-inset text-muted-foreground",
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

function Row({
  task,
  tasks,
  depth,
  onOpen,
}: {
  task: Task;
  tasks: Task[];
  depth: number;
  onOpen: (t: Task) => void;
}) {
  const children = tasks.filter((t) => t.parentId === task.id);
  const [open, setOpen] = useState(true);
  const blockers = task.dependsOn
    .map((id) => tasks.find((t) => t.id === id))
    .filter((t): t is Task => Boolean(t))
    .filter((t) => t.status !== "done");

  return (
    <div className="relative" style={{ paddingLeft: depth ? 26 : 0 }}>
      {depth > 0 && (
        <span className="pointer-events-none absolute left-2 top-0 h-full w-px bg-border" />
      )}
      {depth > 0 && (
        <span className="pointer-events-none absolute left-2 top-8 h-px w-4 bg-border" />
      )}

      <div className="neu-raised neu-lift mb-3 rounded-2xl px-3 py-3 sm:px-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:items-center">
          <div className="flex min-w-0 items-center gap-2">
            {children.length > 0 ? (
              <button
                type="button"
                aria-label={open ? "Collapse subtasks" : "Expand subtasks"}
                onClick={() => setOpen((v) => !v)}
                className="neu-press grid size-6 shrink-0 place-items-center rounded-lg text-muted-foreground"
              >
                {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
            ) : (
              <span className="size-6 shrink-0" />
            )}
            <button
              type="button"
              onClick={() => onOpen(task)}
              className="min-w-0 truncate text-left text-sm font-semibold hover:text-primary"
            >
              {task.title}
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:ml-auto">
            <StatusPill status={task.status} />
            <span className="hidden text-xs text-muted-foreground md:inline">
              {new Date(task.due).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <div className="hidden sm:block">
              <PriorityBadge priority={task.priority} />
            </div>
            <AvatarStack ids={task.assigneeIds} />
          </div>
        </div>

        {blockers.length > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
            <Ban className="size-3 shrink-0" />
            Blocked by {blockers.map((b) => b.title).join(", ")}
          </p>
        )}
      </div>

      {open &&
        children.map((child) => (
          <Row key={child.id} task={child} tasks={tasks} depth={depth + 1} onOpen={onOpen} />
        ))}
    </div>
  );
}

export function TaskTree({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  const roots = tasks.filter((t) => !t.parentId);
  return (
    <div className="neu-inset animate-rise rounded-3xl p-3 sm:p-5">
      {roots.map((task) => (
        <Row key={task.id} task={task} tasks={tasks} depth={0} onOpen={onOpen} />
      ))}
    </div>
  );
}
