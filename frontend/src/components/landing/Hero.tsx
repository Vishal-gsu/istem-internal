"use client";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, BellRing, Clock, KanbanSquare, Users } from "lucide-react";
import { Reveal } from "./Reveal";

export function Hero() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/me`, { credentials: "include" })
      .then(res => {
        if (res.ok) setIsLoggedIn(true);
      })
      .catch(() => {});
  }, []);

  return (
    <section id="top" className="relative w-full overflow-hidden pt-32 pb-16 sm:pt-40 lg:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-10 h-[26rem] w-[26rem] rounded-full bg-primary/20 blur-[110px] sm:h-[34rem] sm:w-[34rem]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-rust-soft/15 blur-[100px]"
      />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
        <div className="min-w-0">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full neu-inset px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-foreground">
              <Clock size={14} /> Internal Hub · v2
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 font-display text-[clamp(2.4rem,6vw,4.25rem)] font-extrabold leading-[1.02] tracking-tight text-foreground">
              The unified workspace for{" "}
              <span className="whitespace-nowrap bg-linear-to-r from-rust-deep via-primary to-rust-soft bg-clip-text text-transparent">
                I-STEM
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Manage projects, track issues, schedule meetings, and run your team from one unified hub.
              Plan the week, run the room, and clear sign-offs — all from one calm, connected workspace.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href={isLoggedIn ? "/dashboard" : `${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/auth/login`}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-7 py-4 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/35"
              >
                {isLoggedIn ? "Dashboard" : "Get Started"}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </a>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-2xl border border-border px-7 py-4 text-sm font-semibold text-foreground transition-all duration-300 hover:scale-[1.02] hover:bg-secondary"
              >
                Learn More
              </button>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4">
              {[
                { k: "10+", v: "Active Modules" },
                { k: "100%", v: "Integrated" },
                { k: "4h", v: "Saved weekly" },
              ].map((s) => (
                <div key={s.v} className="rounded-2xl neu-raised px-4 py-4">
                  <dt className="font-display text-2xl font-extrabold text-foreground">{s.k}</dt>
                  <dd className="mt-1 text-xs font-medium text-muted-foreground">{s.v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal delay={200} className="min-w-0">
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            
            <div className="absolute -top-10 -left-6 z-10 w-64 rounded-2xl neu-glass p-4 hidden sm:block">
              <div className="flex items-center gap-3 mb-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <KanbanSquare size={16} />
                </span>
                <div>
                  <p className="text-xs font-bold text-foreground">Website Revamp</p>
                  <p className="text-[10px] text-muted-foreground">3 Active Issues</p>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary w-2/3" />
              </div>
            </div>

            <div className="float-slow rounded-[2rem] neu-raised p-5 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold text-foreground">
                    This week
                  </p>
                  <p className="truncate text-xs text-muted-foreground">Mon 10 — Fri 14</p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl neu-inset text-primary">
                  <CalendarDays size={18} />
                </span>
              </div>

              <div className="mt-5 grid grid-cols-5 gap-2">
                {["M", "T", "W", "T", "F"].map((d, i) => (
                  <div
                    key={d + i}
                    className={
                      i === 2
                        ? "rounded-xl bg-primary py-3 text-center text-xs font-bold text-primary-foreground"
                        : "rounded-xl neu-inset py-3 text-center text-xs font-semibold text-muted-foreground"
                    }
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3">
                {[
                  { t: "Design review · VIP", s: "10:30 — 11:15" },
                  { t: "Sprint standup", s: "12:00 — 12:20" },
                ].map((m) => (
                  <div
                    key={m.t}
                    className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-sm"
                  >
                    <span className="h-9 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{m.t}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.s}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -bottom-8 -left-2 w-56 rounded-2xl neu-glass p-4 sm:-left-8">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-primary" />
                <p className="text-xs font-bold text-foreground">Task approved</p>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Q3 budget sign-off cleared by VIP desk.
              </p>
            </div>

            <div className="absolute -right-2 -top-6 flex items-center gap-2 rounded-2xl neu-glass px-4 py-3 sm:-right-6">
              <BellRing size={16} className="text-primary" />
              <p className="text-xs font-semibold text-foreground">Reminder in 10m</p>
            </div>
            
            <div className="absolute -right-4 bottom-10 flex flex-col gap-2 rounded-2xl neu-glass px-4 py-3 sm:-right-10 hidden sm:flex">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-7 w-7 rounded-full bg-secondary border-2 border-card flex items-center justify-center">
                    <Users size={12} className="text-muted-foreground" />
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-semibold text-foreground">Team active</p>
            </div>

          </div>
        </Reveal>
      </div>
    </section>
  );
}
