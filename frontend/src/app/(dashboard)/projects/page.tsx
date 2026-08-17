"use client";

import { useEffect, useState } from "react";
import { Briefcase, Search, LayoutGrid, List, Sparkles } from "lucide-react";
import { Reveal } from "@/components/dashboard/Reveal";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { CreateProjectModal } from "@/components/projects/CreateProjectModal";

type Project = {
  id: number;
  title: string;
  start_time: string;
  location: string;
  status: string;
  organizer_email: string;
  my_role: string;
};

export default function ProjectsPage() {
  const { user: account } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/sync/api/projects", { credentials: "include" });
      if (res.ok) {
        setProjects(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account) fetchProjects();
  }, [account]);

  const results = projects.filter((p) =>
    p.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="w-full min-h-[90vh]">
      <div className="mx-auto w-full max-w-[1800px] px-4 pb-40 pt-10 sm:px-6 lg:px-10">
        <div
          aria-hidden
          className="pointer-events-none fixed left-1/2 top-24 -z-10 h-64 w-64 -translate-x-1/2 rounded-full opacity-40 blur-3xl animate-float-slow"
          style={{ background: "var(--gradient-rust)" }}
        />

        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Projects
              </h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                View and manage projects you have access to.
              </p>
            </div>
            <div className="flex gap-4 items-center">
              <Link
                href="/projects/import"
                className="neu-flat flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-primary transition-transform hover:scale-105"
              >
                <Sparkles className="h-4 w-4" />
                AI Import
              </Link>
              <button
                className="neu-raised rounded-2xl px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
                style={{ background: "var(--gradient-rust)" }}
                onClick={() => setCreateOpen(true)}
              >
                New Project
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects..."
                className="neu-inset w-full rounded-2xl bg-transparent py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="neu-inset flex w-fit items-center rounded-2xl p-1">
              <button
                onClick={() => setView("grid")}
                className={`rounded-xl p-2 transition-all ${
                  view === "grid" ? "neu-raised bg-card text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`rounded-xl p-2 transition-all ${
                  view === "list" ? "neu-raised bg-card text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={140}>
          {loading ? (
            <div className="mt-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : results.length === 0 ? (
            <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 text-center">
              <Briefcase className="h-10 w-10 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-foreground">No projects found</p>
              <p className="text-sm text-muted-foreground">
                You haven't been added to any projects yet.
              </p>
            </div>
          ) : view === "grid" ? (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="neu-flat group flex cursor-pointer flex-col justify-between rounded-3xl p-6 transition-all hover:scale-[1.02] hover:bg-card/60"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-semibold text-lg line-clamp-2 leading-tight">
                        {p.title}
                      </h3>
                      <span className="shrink-0 neu-inset rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide text-primary uppercase">
                        {p.my_role}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Status: {p.status}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-8 flex flex-col gap-3">
              {results.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="neu-flat group flex cursor-pointer items-center justify-between gap-4 rounded-2xl p-4 transition-all hover:scale-[1.01] hover:bg-card/60"
                >
                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-card shadow-sm">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{p.title}</h3>
                      <p className="text-xs font-medium text-muted-foreground mt-1">
                        Status: {p.status}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 neu-inset rounded-full px-3 py-1 text-xs font-bold text-primary tracking-wide">
                    {p.my_role}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Reveal>
      </div>
      
      {createOpen && (
        <CreateProjectModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSuccess={fetchProjects}
        />
      )}
    </div>
  );
}
