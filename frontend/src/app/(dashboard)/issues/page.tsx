"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Reveal } from "@/components/dashboard/Reveal";
import { AlertCircle, CheckCircle2, MessageSquare, Plus, ArrowRight } from "lucide-react";
import { useStore } from "@/store/useStore";

type Issue = {
  id: number;
  title: string;
  description: string;
  status: string;
  project_id: number | null;
  meeting_id: number | null;
  creator_email: string;
  assigned_to: string | null;
  created_at: string;
};

export default function IssuesPage() {
  const { user: account } = useAuth();
  const { tasks, setTasks } = useStore();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Issue Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAssignee, setNewAssignee] = useState("");

  const fetchIssues = async () => {
    try {
      const res = await fetch("/api/issues", { credentials: "include" });
      if (res.ok) setIssues(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account) fetchIssues();
  }, [account]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          assigned_to: newAssignee || null,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewTitle("");
        setNewDesc("");
        setNewAssignee("");
        fetchIssues();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const convertToTask = async (issue: Issue) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: `Resolve Issue: ${issue.title}`,
          description: issue.description,
          status: "todo",
          priority: "high",
          email: account?.username,
          assigneeIds: issue.assigned_to ? [issue.assigned_to] : [account?.username],
          meetingId: issue.project_id || 0,
        }),
      });
      
      if (res.ok) {
        alert("Issue successfully converted to a Task!");
        // Update issue status to closed in real implementation, but for now just notify
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[90vh]">
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-40 pt-10 sm:px-6 lg:px-10">
        <div
          aria-hidden
          className="pointer-events-none fixed left-1/2 top-24 -z-10 h-64 w-64 -translate-x-1/2 rounded-full opacity-40 blur-3xl animate-float-slow"
          style={{ background: "var(--gradient-rust)" }}
        />

        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Global Issues
              </h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Track, assign, and resolve cross-cutting issues across all your projects and meetings.
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="neu-raised inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
              style={{ background: "var(--gradient-rust)" }}
            >
              <Plus className="h-4 w-4" />
              Report Issue
            </button>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-10 grid gap-4">
            {issues.length === 0 ? (
              <div className="neu-flat rounded-3xl p-10 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-success/50" />
                <h3 className="mt-4 text-lg font-bold">No issues found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Everything looks good! You haven't reported or been assigned any issues.
                </p>
              </div>
            ) : (
              issues.map((issue) => (
                <div key={issue.id} className="neu-flat rounded-3xl p-6 transition-all hover:-translate-y-1">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <AlertCircle className={`h-5 w-5 ${issue.status === "open" ? "text-destructive" : "text-success"}`} />
                        <h3 className="text-xl font-bold">{issue.title}</h3>
                        <span className="neu-inset rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {issue.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
                        {issue.description}
                      </p>
                      
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-4 w-4" />
                          Created by: {issue.creator_email.split('@')[0]}
                        </div>
                        {issue.assigned_to && (
                          <div className="neu-inset rounded-full px-3 py-1 text-primary">
                            Assigned to: {issue.assigned_to.split('@')[0]}
                          </div>
                        )}
                        {issue.project_id && (
                          <div className="neu-inset rounded-full px-3 py-1">
                            Project #{issue.project_id}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {issue.status === "open" && (
                      <button
                        onClick={() => convertToTask(issue)}
                        className="neu-press inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-transform hover:scale-105"
                      >
                        Convert to Task <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Reveal>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <div className="neu-flat w-full max-w-lg rounded-3xl p-6 animate-fade-in">
              <h2 className="text-2xl font-bold mb-6">Report New Issue</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Title</label>
                  <input
                    required
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="neu-inset w-full rounded-xl bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Brief description of the issue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Description</label>
                  <textarea
                    required
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="neu-inset w-full rounded-xl bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[120px]"
                    placeholder="Detailed steps to reproduce or context..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Assign To (Email, Optional)</label>
                  <input
                    type="email"
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className="neu-inset w-full rounded-xl bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="user@example.com"
                  />
                </div>
                
                <div className="mt-8 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="neu-press rounded-xl px-6 py-3 text-sm font-semibold text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="neu-raised rounded-xl px-6 py-3 text-sm font-semibold text-primary-foreground"
                    style={{ background: "var(--gradient-rust)" }}
                  >
                    Create Issue
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
