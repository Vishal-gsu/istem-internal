import { AvatarStack } from "./AvatarStack";
import type { Task } from "@/data/tasks";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;

export function TimelineView({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  const starts = tasks.map((t) => new Date(t.start).getTime());
  const ends = tasks.map((t) => new Date(t.due || t.start).getTime());
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const span = Math.max(max - min, DAY);

  const weeks: { label: string; left: number }[] = [];
  for (let t = min; t <= max; t += 7 * DAY) {
    weeks.push({
      label: new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      left: ((t - min) / span) * 100,
    });
  }

  return (
    <div className="neu-inset animate-rise overflow-x-auto rounded-3xl p-4 sm:p-6">
      <div className="min-w-[720px]">
        <div className="relative mb-4 h-5 border-b border-border">
          {weeks.map((w) => (
            <span
              key={w.label}
              className="absolute -translate-x-1/2 text-[11px] font-medium text-muted-foreground"
              style={{ left: `${w.left}%` }}
            >
              {w.label}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {tasks.map((task) => {
            const s = new Date(task.start).getTime();
            const e = new Date(task.due || task.start).getTime();
            const left = ((s - min) / span) * 100;
            const width = Math.max(((e - s) / span) * 100, 4);
            return (
              <div key={task.id} className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-4">
                <button
                  type="button"
                  onClick={() => onOpen(task)}
                  className="truncate text-left text-xs font-semibold hover:text-primary"
                >
                  {task.title}
                </button>
                <div className="relative h-10">
                  <button
                    type="button"
                    onClick={() => onOpen(task)}
                    className={cn(
                      "absolute top-1 flex h-8 items-center gap-2 rounded-full px-3 text-[11px] font-semibold text-primary-foreground transition-transform hover:scale-[1.02]",
                      task.status === "done" && "opacity-60",
                    )}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      background: "var(--gradient-rust)",
                      boxShadow: "4px 6px 16px var(--neu-dark)",
                    }}
                  >
                    <AvatarStack ids={task.assigneeIds.slice(0, 2)} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
