import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssigneeSelect } from "./AssigneeSelect";
import { PriorityBadge } from "./PriorityBadge";
import { statusLabels, type Task } from "@/data/tasks";

export function TaskDetailModal({
  task,
  tasks,
  onClose,
  onAssigneesChange,
  onStatusChange,
}: {
  task: Task | null;
  tasks: Task[];
  onClose: () => void;
  onAssigneesChange: (taskId: string, ids: string[]) => void;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
}) {
  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="neu-glass max-h-[90vh] overflow-y-auto rounded-3xl border-0 sm:max-w-lg">
        {task && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6 text-left text-lg leading-snug">
                {task.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={task.priority} />
                <span className="neu-inset rounded-full px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                  Due{" "}
                  {new Date(task.due).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Status
                </h4>
                <div className="neu-inset flex gap-1 rounded-2xl p-1.5">
                  {(["todo", "in-progress", "done"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onStatusChange(task.id, s)}
                      className={`neu-press flex-1 rounded-xl px-2 py-2 text-xs font-semibold ${
                        task.status === s ? "neu-raised text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {statusLabels[s]}
                    </button>
                  ))}
                </div>
              </div>

              {task.dependsOn.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Dependencies
                  </h4>
                  <ul className="space-y-1.5">
                    {task.dependsOn.map((id) => {
                      const dep = tasks.find((t) => t.id === id);
                      if (!dep) return null;
                      return (
                        <li
                          key={id}
                          className="neu-raised rounded-xl px-3 py-2 text-xs font-medium"
                        >
                          {dep.title}{" "}
                          <span className="text-muted-foreground">
                            — {statusLabels[dep.status]}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Task allocation
                </h4>
                <AssigneeSelect
                  value={task.assigneeIds}
                  onChange={(ids) => onAssigneesChange(task.id, ids)}
                />
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
