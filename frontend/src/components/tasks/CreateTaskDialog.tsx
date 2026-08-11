import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssigneeSelect } from "./AssigneeSelect";
import { statusLabels, type Priority, type Status, type Task } from "@/data/tasks";
import { cn } from "@/lib/utils";

export function CreateTaskDialog({
  open,
  onOpenChange,
  tasks,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  onCreate: (task: Task) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [due, setDue] = useState("");

  const reset = () => {
    setTitle("");
    setDescription("");
    setStatus("todo");
    setPriority("medium");
    setAssigneeIds([]);
    setDependsOn([]);
    setDue("");
  };

  const submit = () => {
    if (!title.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    onCreate({
      id: `t${Date.now()}`,
      title: title.trim(),
      description: description.trim() || "No description yet.",
      status,
      priority,
      assigneeIds,
      dependsOn,
      parentId: null,
      start: today,
      due: due || today,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="neu-glass max-h-[90vh] overflow-y-auto rounded-3xl border-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left text-lg">Create new task</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs doing?"
              className="neu-inset w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="neu-inset w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Priority
              </label>
              <div className="neu-inset flex gap-1 rounded-xl p-1.5">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "neu-press flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold capitalize",
                      priority === p ? "neu-raised text-primary" : "text-muted-foreground",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Due date
              </label>
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="neu-inset w-full rounded-xl px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Column
            </label>
            <div className="neu-inset flex gap-1 rounded-xl p-1.5">
              {(["todo", "in-progress", "done"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    "neu-press flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold",
                    status === s ? "neu-raised text-primary" : "text-muted-foreground",
                  )}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Depends on
            </label>
            <div className="flex flex-wrap gap-2">
              {tasks.map((t) => {
                const selected = dependsOn.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setDependsOn((prev) =>
                        selected ? prev.filter((id) => id !== t.id) : [...prev, t.id],
                      )
                    }
                    className={cn(
                      "neu-press max-w-full truncate rounded-full px-3 py-1.5 text-[11px] font-medium",
                      selected ? "neu-raised text-primary" : "neu-inset text-muted-foreground",
                    )}
                  >
                    {t.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Allocate to
            </label>
            <AssigneeSelect value={assigneeIds} onChange={setAssigneeIds} />
          </div>

          <button
            type="button"
            onClick={submit}
            className="neu-press w-full rounded-2xl px-5 py-3 text-sm font-semibold text-primary-foreground"
            style={{
              background: "var(--gradient-rust)",
              boxShadow: "6px 8px 22px color-mix(in oklab, var(--primary) 40%, transparent)",
            }}
          >
            Create task
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
