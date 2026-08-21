"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Reveal } from "@/components/dashboard/Reveal";
import { CheckCircle2, Circle, Layout, Megaphone, ArrowRight, Trophy, Network, BarChart } from "lucide-react";
import Link from "next/link";
import { GanttChart } from "@/components/tasks/GanttChart";
import { TaskTree } from "@/components/tasks/TaskTree";
import { ResourceHeatmap } from "@/components/tasks/ResourceHeatmap";

type Announcement = {
  id: number;
  content: string;
  author: string;
  created_at: string;
};

type Project = {
  id: number;
  title: string;
  status: string;
  my_role: string;
};

type Task = any;

export default function ProjectDashboardPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { user: account } = useAuth();
  
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [leaderboard, setLeaderboard] = useState<{email: string, points: number}[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [projRes, tasksRes, leadRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/projects/${projectId}`, { credentials: "include" }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/project-tasks?project_id=${projectId}`, { credentials: "include" }),
          fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/gamification`, { credentials: "include" })
        ]);
        
        if (projRes.ok) setProject(await projRes.json());
        if (tasksRes.ok) setTasks(await tasksRes.json());
        if (leadRes.ok) setLeaderboard(await leadRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (account && projectId) {
      fetchDashboardData();
      
      const evtSource = new EventSource(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/projects/${projectId}/stream`);
      evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setAnnouncements(prev => [data, ...prev]);
      };
      return () => evtSource.close();
    }
  }, [account, projectId]);

  const postAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/projects/${projectId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: newAnnouncement })
      });
      setNewAnnouncement("");
    } catch (err) {
      console.error("Failed to post announcement", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold">Project Not Found</h2>
        <p className="text-muted-foreground mt-2">You may not have access to this project.</p>
        <Link href="/projects" className="mt-4 text-primary hover:underline">
          &larr; Back to Projects
        </Link>
      </div>
    );
  }

  // Advanced Burndown Algorithm
  let totalScore = 0;
  let doneScore = 0;
  
  tasks.forEach(t => {
    const pMult = t.priority === "high" ? 3 : t.priority === "medium" ? 2 : 1;
    const hrs = t.estimatedHours || 1;
    let daysLeft = 1;
    
    if (t.hardDeadline) {
      const ms = new Date(t.hardDeadline).getTime() - new Date().getTime();
      daysLeft = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }
    
    const score = (hrs * pMult) / daysLeft;
    totalScore += score;
    if (t.status === "done") doneScore += score;
  });

  const progress = totalScore > 0 ? Math.round((doneScore / totalScore) * 100) : 0;
  
  const myTasks = tasks.filter(t => t.assigneeIds?.includes(account?.username || "") || t.email === account?.username);
  const myTasksCount = myTasks.length;

  return (
    <div className="w-full min-h-[90vh]">
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-40 pt-10 sm:px-6 lg:px-10">
        <div
          aria-hidden
          className="pointer-events-none fixed left-1/2 top-24 -z-10 h-64 w-64 -translate-x-1/2 rounded-full opacity-40 blur-3xl animate-float-slow"
          style={{ background: "var(--gradient-rust)" }}
        />

        <Reveal>
          <div className="mb-4">
            <Link href="/projects" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              &larr; Back to Projects
            </Link>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {project.title}
              </h1>
              <div className="mt-3 flex items-center gap-3">
                <span className="neu-inset rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                  {project.my_role}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  Status: {project.status}
                </span>
              </div>
            </div>
            
            <Link 
              href={`/tasks?project=${project.id}`}
              className="neu-raised inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
              style={{ background: "var(--gradient-rust)" }}
            >
              <Layout className="h-4 w-4" />
              View Full Board
            </Link>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link href={`/tasks?project=${project.id}`} className="neu-flat rounded-3xl p-6 transition-transform hover:-translate-y-1">
              <div className="flex justify-between items-center mb-2">
                <span className="neu-inset grid h-10 w-10 shrink-0 place-items-center rounded-xl text-primary">
                  <Layout className="h-5 w-5" />
                </span>
              </div>
              <h3 className="font-display text-3xl font-bold tabular-nums">{tasks.length}</h3>
              <p className="text-sm font-semibold mt-1">Total Tasks</p>
            </Link>
            
            <div className="neu-flat rounded-3xl p-6">
              <div className="flex justify-between items-center mb-2">
                <span className="neu-inset grid h-10 w-10 shrink-0 place-items-center rounded-xl text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
              </div>
              <h3 className="font-display text-3xl font-bold tabular-nums">{progress}%</h3>
              <p className="text-sm font-semibold mt-1">Project Completion</p>
            </div>

            <Link href={`/tasks?project=${project.id}`} className="neu-flat rounded-3xl p-6 transition-transform hover:-translate-y-1 border border-primary/20 bg-primary/5">
              <div className="flex justify-between items-center mb-2">
                <span className="neu-inset grid h-10 w-10 shrink-0 place-items-center rounded-xl text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
              </div>
              <h3 className="font-display text-3xl font-bold tabular-nums text-primary">{myTasksCount}</h3>
              <p className="text-sm font-semibold mt-1 text-primary">Tasks Assigned to Me</p>
            </Link>
          </div>
        </Reveal>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            <Reveal delay={80}>
              <div className="neu-flat rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Project Timeline (Gantt)</h2>
                </div>
                <GanttChart tasks={tasks} />
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="neu-flat rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Network className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Task Hierarchy (Tree)</h2>
                </div>
                {tasks.length > 0 ? (
                  <div className="bg-background/50 rounded-2xl p-4">
                    <TaskTree tasks={tasks} onOpen={() => {}} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">No tasks assigned yet.</p>
                )}
              </div>
            </Reveal>

            <Reveal delay={120}>
              <ResourceHeatmap tasks={tasks} />
            </Reveal>
          </div>

          {/* Sidebar Area - Announcements & Details */}
          <div className="space-y-6">
            <Reveal delay={140}>
              <div className="neu-flat rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Megaphone className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">Live Announcements</h2>
                </div>
                
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                  {announcements.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No announcements yet.</p>
                  ) : (
                    announcements.map((a, i) => (
                      <div key={i} className="neu-inset rounded-xl p-3 text-sm">
                        <p className="font-medium">{a.content}</p>
                        <p className="text-xs text-muted-foreground mt-1 text-right">- {a.author}</p>
                      </div>
                    ))
                  )}
                </div>

                {(project.my_role === "Owner" || project.my_role === "Manager" || project.my_role === "PM") && (
                  <form onSubmit={postAnnouncement} className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      placeholder="Post a shoutout..."
                      className="neu-inset flex-1 rounded-xl bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      type="submit"
                      className="neu-raised rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
                      style={{ background: "var(--gradient-rust)" }}
                    >
                      Post
                    </button>
                  </form>
                )}
              </div>
            </Reveal>

            <Reveal delay={160}>
              <div className="neu-flat rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">Leaderboard (Global)</h2>
                </div>
                <div className="space-y-3">
                  {leaderboard.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">No points awarded yet.</p>
                  ) : (
                    leaderboard.slice(0, 5).map((user, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-muted-foreground">
                          {i + 1}. {user.email.split("@")[0]}
                        </span>
                        <span className="neu-inset rounded-full px-2 py-0.5 font-bold text-primary">
                          {user.points} pts
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Reveal>
            
            <Reveal delay={180}>
              <div className="neu-flat rounded-3xl p-6">
                <h2 className="text-lg font-bold mb-4">Project Details</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID</span>
                    <span className="font-medium">#{project.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Access</span>
                    <span className="font-medium">Private (RBAC)</span>
                  </div>
                </div>

                {(project.my_role === "Owner" || project.my_role === "PM") && (
                  <div className="mt-6 pt-6 border-t border-primary/10">
                    <h3 className="text-sm font-bold mb-3">Invite Member</h3>
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const email = formData.get("email") as string;
                        const role = formData.get("role") as string;
                        if (!email) return;
                        
                        try {
                          await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/projects/${projectId}/invites`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ email, role })
                          });
                          alert("Invite sent!");
                          (e.target as HTMLFormElement).reset();
                        } catch (err) {
                          alert("Failed to send invite or user already in project.");
                        }
                      }}
                      className="space-y-3"
                    >
                      <input 
                        type="email" 
                        name="email"
                        placeholder="user@example.com" 
                        required
                        className="neu-inset w-full rounded-xl bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <select 
                        name="role"
                        className="neu-inset w-full appearance-none rounded-xl bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="Team Member">Team Member</option>
                        <option value="Manager">Manager</option>
                        <option value="PM">Project Manager</option>
                      </select>
                      <button 
                        type="submit"
                        className="neu-raised w-full rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                        style={{ background: "var(--gradient-rust)" }}
                      >
                        Send Invite
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}
