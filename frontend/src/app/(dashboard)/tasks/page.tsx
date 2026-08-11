"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskTree } from "@/components/tasks/TaskTree";
import { TimelineView } from "@/components/tasks/TimelineView";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { ViewToggle, type ViewKey } from "@/components/tasks/ViewToggle";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { type Task } from "@/data/tasks";
import { Reveal } from "@/components/dashboard/Reveal";
import { useAuth } from "@/components/AuthProvider";

export default function TasksPage() {
  const { user: account } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<ViewKey>("kanban");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const userEmail = account?.username || "";
        const tasksUrl = userEmail ? `/api/tasks?email=${userEmail}` : "/api/tasks";
        const res = await fetch(tasksUrl, { credentials: "include" });
        if (res.ok) setTasks(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (account) fetchTasks();
  }, [account]);

  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;

  const patch = async (id: string, next: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...next } : t)));
    
    // Auto-save status if patched
    if (next.status) {
      try {
        await fetch(`/api/tasks/${id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ status: next.status }),
        });
      } catch (e) {
        console.error("Failed to update task status", e);
      }
    }
  };

  return (
    <div className="w-full min-h-[90vh]">
      <div className="mx-auto w-full max-w-[1800px] px-4 pb-40 pt-10 sm:px-6 lg:px-10">
        <div
          aria-hidden
          className="pointer-events-none fixed left-1/2 top-24 -z-10 h-64 w-64 -translate-x-1/2 rounded-full opacity-40 blur-3xl animate-float-slow"
          style={{ background: "var(--gradient-rust)" }}
        />

        <Reveal>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Tasks &amp; Planner
              </h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                Plan your projects, allocate resources, and track dependencies.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="neu-raised inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
              style={{ background: "var(--gradient-rust)" }}
            >
              <Plus className="size-4" />
              Create New Task
            </button>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <ViewToggle value={view} onChange={setView} />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {tasks.length} tasks · {tasks.filter((t) => t.status === "done").length} completed
            </p>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="mt-8">
            {view === "kanban" && (
              <KanbanBoard tasks={tasks} onOpen={(t) => setOpenTaskId(t.id)} />
            )}
            {view === "tree" && <TaskTree tasks={tasks} onOpen={(t) => setOpenTaskId(t.id)} />}
            {view === "timeline" && (
              <TimelineView tasks={tasks} onOpen={(t) => setOpenTaskId(t.id)} />
            )}
          </div>
        </Reveal>

        {openTaskId && (
          <TaskDetailModal
            task={openTask}
            tasks={tasks}
            onClose={() => setOpenTaskId(null)}
            onAssigneesChange={(id, ids) => patch(id, { assigneeIds: ids })}
            onStatusChange={(id, status) => patch(id, { status })}
          />
        )}

        {creating && (
          <CreateTaskDialog
            open={creating}
            onOpenChange={setCreating}
            tasks={tasks}
            onCreate={async (task) => {
              try {
                const res = await fetch("/api/tasks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    priority: task.priority,
                    assigneeIds: task.assigneeIds,
                    start: task.start,
                    due: task.due,
                    dependsOn: task.dependsOn
                  })
                });
                if (res.ok) {
                  const data = await res.json();
                  setTasks((prev) => [...prev, { ...task, id: String(data.task_id) }]);
                } else {
                  // Fallback if failed
                  setTasks((prev) => [...prev, task]);
                }
              } catch (err) {
                console.error(err);
                setTasks((prev) => [...prev, task]);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
