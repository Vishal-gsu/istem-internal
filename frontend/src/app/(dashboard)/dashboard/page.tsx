"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ListTodo,
  Video,
  RotateCcw,
  Check,
  X,
  ArrowUpRight,
} from "lucide-react";
import { Reveal } from "@/components/dashboard/Reveal";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function Dashboard() {
  const now = useClock();
  const { user: account } = useAuth();
  const { tasks, meetings, setTasks, setMeetings, updateTaskStatus } = useStore();
  const [loading, setLoading] = useState(true);
  const [pendingMeetings, setPendingMeetings] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userEmail = account?.username || "";
        const tasksUrl = userEmail ? `/api/tasks?email=${userEmail}` : "/api/tasks";
        const meetingsUrl = userEmail ? `/api/meetings?email=${userEmail}` : "/api/meetings";
        const approvalsUrl = userEmail ? `/api/pending-approvals?email=${userEmail}` : null;

        const [tasksRes, meetingsRes] = await Promise.all([
          fetch(tasksUrl, { credentials: "include" }),
          fetch(meetingsUrl, { credentials: "include" })
        ]);

        if (tasksRes.ok) setTasks(await tasksRes.json());
        if (meetingsRes.ok) setMeetings(await meetingsRes.json());

        if (approvalsUrl) {
          const appRes = await fetch(approvalsUrl, { credentials: "include" });
          if (appRes.ok) setPendingMeetings(await appRes.json());
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    if (account) {
      fetchData();
    }
  }, [setTasks, setMeetings, account]);

  const handleApprove = async (id: number) => {
    try {
      await fetch("/api/approve-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ meeting_id: id })
      });
      // Refresh Data
      const appRes = await fetch(`/api/pending-approvals?email=${account?.username}`, { credentials: "include" });
      if (appRes.ok) setPendingMeetings(await appRes.json());
      const meetingsRes = await fetch(`/api/meetings?email=${account?.username}`, { credentials: "include" });
      if (meetingsRes.ok) setMeetings(await meetingsRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskToggle = async (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    updateTaskStatus(id, newStatus);
    try {
      await fetch(`/api/tasks/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.error("Failed to save task status", err);
    }
  };

  const greeting = (() => {
    const h = now?.getHours() ?? 9;
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  })();
  
  const firstName = account?.name?.split(" ")[0] || "VIP";

  const todaysEvents = meetings
    .filter((m: any) => !m.status.includes('Cancelled'))
    .filter((m: any) => new Date(m.start_time).toDateString() === new Date().toDateString())
    .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const activeTasks = tasks.filter(t => t.status !== "done");
  const doneTasks = tasks.filter(t => t.status === "done");
  const allDisplayTasks = [...activeTasks, ...doneTasks].slice(0, 8); // Just show top 8 in widget

  const pendingCount = meetings.filter((m: any) => m.status.includes("Pending")).length;

  const stats = [
    { label: "Meetings Today", value: todaysEvents.length.toString(), hint: "Next up soon", icon: CalendarDays },
    { label: "Pending Approvals", value: pendingCount.toString(), hint: "Require attention", icon: CheckCircle2 },
    { label: "Tasks Due", value: activeTasks.length.toString(), hint: "Needs attention", icon: ListTodo },
  ];

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        aria-hidden
        className="pointer-events-none fixed -left-32 top-40 -z-10 h-96 w-96 rounded-full opacity-40 blur-3xl animate-float-slow"
        style={{ background: "var(--gradient-rust)" }}
      />

      <div className="mx-auto w-full max-w-[1800px] px-4 pb-20 pt-8 sm:px-6 lg:px-10">
        {/* Welcome */}
        <Reveal>
          <section className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">Dashboard overview</p>
              <h1 className="mt-2 truncate text-3xl font-bold sm:text-4xl">{greeting}, {firstName}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Here's everything that needs you today.
              </p>
            </div>
            <div className="neu-inset shrink-0 rounded-2xl px-5 py-3 text-right">
              <p className="font-display text-xl font-semibold tabular-nums">
                {now
                  ? now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                  : "--:--"}
              </p>
              <p className="text-xs text-muted-foreground">
                {now
                  ? now.toLocaleDateString(undefined, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })
                  : "\u00a0"}
              </p>
            </div>
          </section>
        </Reveal>

        {/* Stats */}
        <section className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((s, i) => {
            const href =
              s.label === "Meetings Today"
                ? "/meetings"
                : s.label === "Pending Approvals"
                  ? "/meetings" // Pending approvals usually require looking at meetings
                  : "/tasks";
            return (
              <Reveal key={s.label} delay={i * 90}>
                <article
                  onClick={() => window.location.href = href}
                  className="neu-raised group h-full rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="neu-inset grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-primary">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="mt-5 font-display text-4xl font-bold tabular-nums">{s.value}</p>
                  <p className="mt-1 text-sm font-semibold">{s.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
                </article>
              </Reveal>
            );
          })}
        </section>

        {/* Main grid */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Agenda */}
          <Reveal className="lg:col-span-3" delay={80}>
            <section className="neu-raised rounded-3xl p-5 sm:p-7">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold">Today's Agenda</h2>
                  <p className="text-xs text-muted-foreground">{todaysEvents.length} meetings today</p>
                </div>
                <span className="neu-inset shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  Chronological
                </span>
              </div>

              <ol className="mt-6 space-y-4">
                {todaysEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No meetings scheduled for today.</p>
                )}
                {todaysEvents.map((m: any) => (
                  <li key={m.id} className="relative pl-6 sm:pl-8">
                    <span className="absolute left-1.5 top-6 h-full w-px bg-border last:hidden" />
                    <span className="absolute left-0 top-5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                    <article 
                      className="neu-inset rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        window.location.href = '/calendar';
                      }}
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span className="tabular-nums">
                              {new Date(m.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-muted-foreground font-normal">· {m.duration_minutes || "30"}m</span>
                          </div>
                          <h3 className="mt-2 text-base font-semibold leading-snug group-hover:text-primary transition-colors">{m.title}</h3>
                        </div>
                        <span className="shrink-0 rounded-full border-2 border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {m.status}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex -space-x-2">
                          <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-background bg-secondary text-[10px] font-bold text-secondary-foreground">
                            {firstName.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); window.open('https://teams.microsoft.com', '_blank'); }}
                            className="neu-press inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-primary-foreground"
                            style={{ background: "var(--gradient-rust)" }}
                          >
                            <Video className="h-3.5 w-3.5" /> Join Teams
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); window.location.href = '/calendar'; }} 
                            className="neu-press inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" /> Details
                          </button>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            </section>
          </Reveal>

          {/* Action center */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Reveal delay={140}>
              <section className="neu-raised rounded-3xl p-5 sm:p-7">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <h2 className="truncate text-xl font-bold">Approvals</h2>
                  <span className="shrink-0 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
                    {pendingMeetings.length} waiting
                  </span>
                </div>

                <ul className="mt-5 space-y-3">
                  {pendingMeetings.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">You are all caught up!</p>
                  )}
                  {pendingMeetings.map((a: any) => (
                    <li key={a.id} className="neu-inset rounded-2xl p-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{a.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(a.start_time).toLocaleDateString()}
                          <span className="ml-2 font-semibold text-destructive">Urgent</span>
                        </p>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => handleApprove(a.id)} className="neu-press inline-flex flex-1 items-center justify-center gap-1.5 rounded-full bg-success/15 px-3 py-2 text-xs font-semibold text-success">
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button className="neu-press inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-destructive/40 px-3 py-2 text-xs font-semibold text-destructive">
                          <X className="h-3.5 w-3.5" /> Decline
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>

            <Reveal delay={200}>
              <section className="neu-raised rounded-3xl p-5 sm:p-7">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <h2 className="truncate text-xl font-bold">Active Tasks</h2>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {doneTasks.length}/{tasks.length} done
                  </span>
                </div>

                <ul className="mt-5 space-y-3">
                  {allDisplayTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No tasks assigned.</p>
                  )}
                  {allDisplayTasks.map((t: any) => {
                    const isDone = t.status === "done";
                    return (
                    <li key={t.id}>
                      <button
                        onClick={() => handleTaskToggle(t.id, t.status)}
                        className="neu-inset flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
                            isDone
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border"
                          }`}
                        >
                          {isDone && <Check className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-sm font-medium ${
                              isDone ? "text-muted-foreground line-through" : ""
                            }`}
                          >
                            {t.title}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground uppercase">
                          {t.priority || "Normal"}
                        </span>
                      </button>
                    </li>
                  );
                  })}
                </ul>
              </section>
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}
