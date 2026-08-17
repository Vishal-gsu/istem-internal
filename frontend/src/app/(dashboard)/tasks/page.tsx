"use client";

import { useState, useEffect, Suspense } from "react";
import { Plus, Filter, ChevronDown } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { TaskTree } from "@/components/tasks/TaskTree";
import { TimelineView } from "@/components/tasks/TimelineView";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { ViewToggle, type ViewKey } from "@/components/tasks/ViewToggle";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { type Task } from "@/data/tasks";
import { Reveal } from "@/components/dashboard/Reveal";
import { useAuth } from "@/components/AuthProvider";
import { Combobox } from "@/components/ui/Combobox";

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading tasks...</div>}>
      <TasksContent />
    </Suspense>
  );
}

function TasksContent() {
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("project");
  const { user: account } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<ViewKey>("kanban");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || "all");

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/sync/api/projects", { credentials: "include" });
        if (res.ok) setProjects(await res.json());
      } catch (err) {}
    };
    if (account) fetchProjects();
  }, [account]);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const userEmail = account?.username || "";
        const tasksUrl = userEmail ? `/sync/api/project-tasks?email=${userEmail}` : "/sync/api/project-tasks";
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
    
    // Auto-save if patched
    try {
      const payload: any = {};
      if (next.status) payload.status = next.status;
      if (next.due) payload.hard_deadline = next.due;
      if (next.targetDate) payload.target_date = next.targetDate;
      if (next.assigneeIds) payload.assignees = next.assigneeIds;
      if (next.estimatedHours !== undefined) payload.estimated_hours = next.estimatedHours;

      if (Object.keys(payload).length > 0) {
        await fetch(`/sync/api/project-tasks/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      }
    } catch (e) {
      console.error("Failed to update task", e);
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

        <Reveal delay={80} className="relative z-50">
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between relative z-50">
            <div className="flex items-center gap-4 relative z-50">
              <ViewToggle value={view} onChange={setView} />
              
              <div className="w-64 relative z-50">
                <Combobox
                  options={[
                    { value: "all", label: "All My Tasks" },
                    { value: "delegated", label: "Tasks I Delegated" },
                    ...projects.map(p => ({ value: String(p.id), label: p.title }))
                  ]}
                  value={selectedProjectId}
                  onChange={setSelectedProjectId}
                  icon={<Filter className="h-4 w-4" />}
                />
              </div>
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {tasks.filter(t => {
                if (selectedProjectId === "all") return t.assigneeIds.includes(account?.username || "");
                if (selectedProjectId === "delegated") return t.assignorEmail === account?.username && !t.assigneeIds.includes(account?.username || "");
                return t.projectId === selectedProjectId || t.meetingId === selectedProjectId;
              }).length} tasks
            </p>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="mt-8">
            {view === "kanban" && (
              <KanbanBoard tasks={tasks.filter(t => {
                if (selectedProjectId === "all") return t.assigneeIds.includes(account?.username || "");
                if (selectedProjectId === "delegated") return t.assignorEmail === account?.username && !t.assigneeIds.includes(account?.username || "");
                return t.projectId === selectedProjectId || t.meetingId === selectedProjectId;
              })} onOpen={(t) => setOpenTaskId(t.id)} />
            )}
            {view === "tree" && <TaskTree tasks={tasks.filter(t => {
                if (selectedProjectId === "all") return t.assigneeIds.includes(account?.username || "");
                if (selectedProjectId === "delegated") return t.assignorEmail === account?.username && !t.assigneeIds.includes(account?.username || "");
                return t.projectId === selectedProjectId || t.meetingId === selectedProjectId;
              })} onOpen={(t) => setOpenTaskId(t.id)} />}
            {view === "timeline" && (
              <TimelineView tasks={tasks.filter(t => {
                if (selectedProjectId === "all") return t.assigneeIds.includes(account?.username || "");
                if (selectedProjectId === "delegated") return t.assignorEmail === account?.username && !t.assigneeIds.includes(account?.username || "");
                return t.projectId === selectedProjectId || t.meetingId === selectedProjectId;
              })} onOpen={(t) => setOpenTaskId(t.id)} />
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
            onCreateTask={async (task) => {
              try {
                const res = await fetch("/sync/api/tasks", {
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
                    dependsOn: task.dependsOn,
                    parentId: task.parentId,
                    weight: task.weight
                  })
                });
                if (res.ok) {
                  const data = await res.json();
                  setTasks((prev) => [...prev, { ...task, id: String(data.task_id) }]);
                } else {
                  setTasks((prev) => [...prev, task]);
                }
              } catch (err) {
                console.error(err);
                setTasks((prev) => [...prev, task]);
              }
            }}
          />
        )}

        {creating && (
          <CreateTaskDialog
            open={creating}
            onOpenChange={setCreating}
            tasks={tasks}
            onCreate={async (task) => {
              try {
                const res = await fetch("/sync/api/project-tasks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    priority: task.priority,
                    assignees: task.assigneeIds,
                    start_date: task.start,
                    target_date: task.due,
                    hard_deadline: task.due,
                    depends_on: task.dependsOn,
                    weight: task.weight,
                    project_id: selectedProjectId !== "all" ? parseInt(selectedProjectId) : null
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
