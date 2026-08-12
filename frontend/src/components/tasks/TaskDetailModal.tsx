import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssigneeSelect } from "./AssigneeSelect";
import { PriorityBadge } from "./PriorityBadge";
import { statusLabels, type Task } from "@/data/tasks";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { useState } from "react";
import { CheckCircle2, Circle, GitMerge, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export function TaskDetailModal({
  task,
  tasks,
  onClose,
  onAssigneesChange,
  onStatusChange,
  onCreateTask,
}: {
  task: Task | null;
  tasks: Task[];
  onClose: () => void;
  onAssigneesChange: (taskId: string, ids: string[]) => void;
  onStatusChange: (taskId: string, status: Task["status"]) => void;
  onCreateTask?: (task: any) => void;
}) {
  const { user: account } = useAuth();
  const [creatingSubTask, setCreatingSubTask] = useState(false);

  const subTasks = task ? tasks.filter(t => t.parentId === task.id) : [];

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
                  Est. {task.estimatedHours || 0} hrs
                </span>
                {task.targetDate && (
                  <span className="neu-inset rounded-full px-3 py-1 text-[11px] font-semibold text-warning/80 border border-warning/30">
                    Target: {new Date(task.targetDate).toLocaleDateString()}
                  </span>
                )}
                {(task.hardDeadline || task.due) && (
                  <span className="neu-inset rounded-full px-3 py-1 text-[11px] font-semibold text-destructive/80 border border-destructive/30">
                    Deadline: {new Date(task.hardDeadline || task.due!).toLocaleDateString()}
                  </span>
                )}
              </div>

              <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Status
                </h4>
                
                {task.status === "pending_review" ? (
                  <div className="neu-flat rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
                    <div className="flex items-center gap-2 text-warning">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm font-bold">Task Pending Review</span>
                    </div>
                    {account?.username === task.assignorEmail ? (
                      <button 
                        onClick={() => onStatusChange(task.id, "done")}
                        className="neu-raised bg-success/10 text-success rounded-xl px-6 py-2 text-sm font-bold transition hover:scale-105"
                      >
                        Approve & Mark Done
                      </button>
                    ) : (
                      <p className="text-xs text-muted-foreground">Waiting for {task.assignorEmail} to approve.</p>
                    )}
                  </div>
                ) : (
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
                )}
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

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Sub-tasks ({subTasks.length})
                  </h4>
                  {onCreateTask && (
                    <button
                      onClick={() => setCreatingSubTask(true)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <GitMerge className="h-3 w-3" />
                      Break Down
                    </button>
                  )}
                </div>
                
                {subTasks.length > 0 ? (
                  <ul className="space-y-1.5">
                    {subTasks.map(sub => (
                      <li key={sub.id} className="neu-inset flex items-center justify-between rounded-xl px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          {sub.status === "done" ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={sub.status === "done" ? "text-muted-foreground line-through" : ""}>
                            {sub.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground">
                          W:{sub.weight || 1}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="neu-flat rounded-xl p-4 text-center text-xs text-muted-foreground">
                    No sub-tasks yet. Break this task down to delegate it!
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
      
      {creatingSubTask && task && onCreateTask && (
        <CreateTaskDialog
          open={creatingSubTask}
          onOpenChange={setCreatingSubTask}
          tasks={tasks}
          initialParentId={task.id}
          onCreate={(newTask) => {
            onCreateTask(newTask);
            setCreatingSubTask(false);
          }}
        />
      )}
    </Dialog>
  );
}
