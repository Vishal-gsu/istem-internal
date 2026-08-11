import { CalendarDays } from "lucide-react";
import { CalendarBoard } from "./CalendarBoard";

export function CalendarPage() {
  return (
    <main className="flex min-h-screen w-full flex-col gap-5 bg-background px-3 py-5 sm:px-6 sm:py-8 lg:px-10">
      <header className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <CalendarDays size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              My Calendar
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Manage, Reschedule, or Cancel your scheduled meetings.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 rounded-2xl neu-raised px-4 py-3">
          <Legend tone="rust" label="Scheduled" />
          <Legend tone="amber" label="Pending VIP" />
        </div>
      </header>

      <CalendarBoard />
    </main>
  );
}

function Legend({ tone, label }: { tone: "rust" | "amber"; label: string }) {
  return (
    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
      <span
        className={
          tone === "rust"
            ? "h-3 w-3 rounded-full bg-primary"
            : "h-3 w-3 rounded-full border-2 border-dashed border-amber-deep bg-amber-soft"
        }
      />
      {label}
    </span>
  );
}
