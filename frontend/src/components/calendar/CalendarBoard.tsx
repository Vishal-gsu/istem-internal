"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { EventDialog } from "./EventDialog";
import { useAuth } from "@/components/AuthProvider";
import {
  DAY_LABELS,
  END_HOUR,
  START_HOUR,
  eventDates,
  formatHourLabel,
  formatIstTime,
  startOfWeek,
  type CalendarEvent,
} from "./events";

const HOUR_HEIGHT = 76;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

export function CalendarBoard() {
  const { user: account } = useAuth();
  const [view, setView] = useState<"week" | "day">("week");
  const [autoView, setAutoView] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDay, setActiveDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [meetings, setMeetings] = useState<any[]>([]);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const userEmail = account?.username || "";
        const meetingsUrl = userEmail ? `/sync/api/meetings?email=${userEmail}` : "/sync/api/meetings";
        const res = await fetch(meetingsUrl, { credentials: "include" });
        if (res.ok) {
          setMeetings(await res.json());
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (account) fetchMeetings();
  }, [account]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => {
      if (autoView) setView(mq.matches ? "day" : "week");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [autoView]);

  const weekStart = useMemo(() => {
    const d = startOfWeek(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const dynamicEvents = useMemo(() => {
    return meetings
      .filter((m: any) => !m.status.includes("Cancelled") && !m.status.includes("Declined"))
      .map((m: any) => {
        const startDt = new Date(m.start_time);
        const endDt = new Date(m.end_time || m.start_time);
        if (!m.end_time) endDt.setMinutes(endDt.getMinutes() + 30);
        
        // Match day mapping: Monday=0, Sunday=6 (as per startOfWeek logic)
        let day = startDt.getDay() - 1;
        if (day < 0) day = 6;
        
        const start = startDt.getHours() + startDt.getMinutes() / 60;
        const end = endDt.getHours() + endDt.getMinutes() / 60;
        
        return {
          id: String(m.id),
          title: m.title,
          day,
          start,
          end,
          location: m.location || "Online",
          status: m.status.includes("Pending VIP") ? "pending" : "scheduled",
          attendee: m.attendee,
          is_vip: m.is_vip,
          originalStart: startDt, // So we can filter by the exact week!
        } as CalendarEvent & { originalStart: Date };
      })
      .filter((e) => {
        // Only show events for the currently viewed week
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return e.originalStart >= weekStart && e.originalStart < weekEnd;
      });
  }, [meetings, weekStart]);

  const visibleDays = view === "week" ? DAY_LABELS.map((_, i) => i) : [activeDay];

  const dayDate = (day: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + day);
    return d;
  };

  const rangeLabel = useMemo(() => {
    if (view === "day") {
      return dayDate(activeDay).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
      });
    }
    const end = dayDate(6);
    return `${weekStart.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  }, [view, activeDay, weekStart]);

  const shift = (dir: -1 | 1) => {
    if (view === "day") {
      const next = activeDay + dir;
      if (next < 0) {
        setWeekOffset((w) => w - 1);
        setActiveDay(6);
      } else if (next > 6) {
        setWeekOffset((w) => w + 1);
        setActiveDay(0);
      } else {
        setActiveDay(next);
      }
      return;
    }
    setWeekOffset((w) => w + dir);
  };

  const openEvent = (event: CalendarEvent) => {
    setSelected(event);
    setOpen(true);
  };

  const selectedDates = selected ? eventDates(selected, weekStart) : null;

  return (
    <div className="flex w-full flex-1 flex-col gap-4">
      {/* Toolbar */}
      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl neu-raised px-4 py-3 sm:flex sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center gap-1 rounded-2xl neu-inset p-1">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => shift(-1)}
              className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-card hover:text-primary"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => shift(1)}
              className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-card hover:text-primary"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-extrabold tracking-tight text-foreground sm:text-lg">
              {rangeLabel}
            </p>
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Asia/Kolkata · IST
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="flex items-center gap-1 rounded-2xl neu-inset p-1"
            role="group"
            aria-label="Calendar view"
          >
            {(["day", "week"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => {
                  setAutoView(false);
                  setView(v);
                }}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition sm:text-sm sm:tracking-normal sm:capitalize",
                  view === v
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Link
            href="/schedule"
            className="hidden items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:scale-[1.03] lg:inline-flex"
          >
            <Plus size={16} /> New meeting
          </Link>
        </div>
      </div>

      {/* Grid */}
      <div className="flex w-full flex-1 flex-col overflow-hidden rounded-3xl neu-raised">
        {/* Day headers */}
        <div
          className="grid border-b border-border/70 bg-card/40"
          style={{
            gridTemplateColumns: `4rem repeat(${visibleDays.length}, minmax(0,1fr))`,
          }}
        >
          <div />
          {visibleDays.map((day) => {
            const d = dayDate(day);
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setActiveDay(day);
                  if (view === "week") return;
                }}
                className="flex flex-col items-center gap-1 px-2 py-3 text-center transition hover:bg-secondary/60"
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {DAY_LABELS[day]}
                </span>
                <span
                  className={cn(
                    "grid h-8 min-w-8 place-items-center rounded-xl px-2 font-display text-sm font-extrabold",
                    isToday
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "text-foreground",
                  )}
                >
                  {d.getDate()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div
            className="grid w-full flex-1"
            style={{
              gridTemplateColumns: `4rem repeat(${visibleDays.length}, minmax(0,1fr))`,
              minHeight: HOURS.length * HOUR_HEIGHT,
            }}
          >
            {/* hour gutter */}
            <div className="relative border-r border-border/70">
              {HOURS.map((h, i) => (
                <span
                  key={h}
                  className="absolute right-2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  style={{ top: `${(i / HOURS.length) * 100}%` }}
                >
                  {formatHourLabel(h)}
                </span>
              ))}
            </div>

            {visibleDays.map((day) => (
              <div key={day} className="relative border-r border-border/50 last:border-r-0">
                {HOURS.map((h, i) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-border/60"
                    style={{ top: `${(i / HOURS.length) * 100}%` }}
                  />
                ))}

                {dynamicEvents.filter((e) => e.day === day).map((event) => {
                  const dates = eventDates(event, weekStart);
                  const pending = event.status === "pending";
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => openEvent(event)}
                      style={{
                        top: `${((event.start - START_HOUR) / HOURS.length) * 100}%`,
                        height: `calc(${((event.end - event.start) / HOURS.length) * 100}% - 6px)`,
                        marginTop: 3,
                      }}
                      className={cn(
                        "absolute inset-x-1.5 flex flex-col items-start gap-0.5 overflow-hidden rounded-[14px] p-2 text-left transition-all duration-300 hover:z-50 hover:scale-[1.08] hover:shadow-2xl border border-transparent group",
                        pending
                          ? "border-amber-deep/30 bg-amber-soft text-amber-deep shadow-sm hover:border-amber-deep/60"
                          : "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:shadow-primary/40",
                      )}
                    >
                      <span className="text-[11px] sm:text-xs font-extrabold leading-tight w-full truncate group-hover:whitespace-normal group-hover:overflow-visible">
                        {event.title}
                      </span>
                      
                      <span className={cn(
                        "text-[9px] font-semibold opacity-90 transition-all",
                        event.end - event.start <= 0.5 ? "hidden group-hover:block mt-1" : "block mt-0.5"
                      )}>
                        {formatIstTime(dates.start)} – {formatIstTime(dates.end)}
                      </span>
                      
                      <span className="hidden group-hover:block text-[9px] opacity-80 mt-1 w-full truncate">
                        {event.location}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <EventDialog
        event={selected}
        dates={selectedDates}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
