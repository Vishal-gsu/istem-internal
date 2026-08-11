import { TaskCard } from "./TaskCard";
import { statusLabels, type Status, type Task } from "@/data/tasks";

const columns: Status[] = ["todo", "in-progress", "done"];

export function KanbanBoard({
  tasks,
  onOpen,
}: {
  tasks: Task[];
  onOpen: (task: Task) => void;
}) {
  const titleOf = (id: string) => tasks.find((t) => t.id === id)?.title;

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible">
      {columns.map((status, i) => {
        const items = tasks.filter((t) => t.status === status);
        return (
          <section
            key={status}
            className="neu-inset animate-rise w-[85vw] shrink-0 snap-center rounded-3xl p-4 sm:w-[360px] lg:w-auto"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <header className="mb-4 flex items-center justify-between gap-3 px-1">
              <h2 className="text-sm font-bold tracking-tight">{statusLabels[status]}</h2>
              <span className="neu-raised rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {items.length}
              </span>
            </header>
            <div className="flex flex-col gap-4">
              {items.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  dependencyTitle={task.dependsOn[0] ? titleOf(task.dependsOn[0]) : undefined}
                  onOpen={() => onOpen(task)}
                />
              ))}
              {items.length === 0 && (
                <p className="rounded-2xl px-3 py-8 text-center text-xs text-muted-foreground">
                  Nothing here yet.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
