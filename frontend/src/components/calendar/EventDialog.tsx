"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  RotateCcw,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  formatIstDate,
  formatIstTime,
  type CalendarEvent,
} from "./events";

interface EventDialogProps {
  event: CalendarEvent | null;
  dates: { start: Date; end: Date } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const inputClass =
  "w-full rounded-xl border-0 neu-inset px-4 py-3 text-sm font-medium text-foreground outline-none ring-primary/40 transition focus:ring-2";

export function EventDialog({ event, dates, open, onOpenChange }: EventDialogProps) {
  const [mode, setMode] = useState<"details" | "reschedule">("details");

  useEffect(() => {
    if (open) setMode("details");
  }, [open, event?.id]);

  const pending = event?.status === "pending";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden rounded-3xl border-0 neu-raised p-0 shadow-none">
        <div className="relative p-6 sm:p-7">
          <span
            className={cn(
              "absolute inset-x-0 top-0 h-1.5",
              pending ? "bg-amber" : "bg-primary",
            )}
            aria-hidden
          />

          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]",
                  pending
                    ? "bg-amber-soft text-amber-deep"
                    : "bg-accent text-accent-foreground",
                )}
              >
                {pending ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                {pending ? "Pending VIP" : "Scheduled"}
              </span>
            </div>
            <DialogTitle className="font-display text-2xl font-extrabold leading-tight tracking-tight text-foreground">
              {event?.title ?? "Meeting"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {mode === "details"
                ? "Review the meeting details below, then reschedule or cancel."
                : "Propose a new slot and tell the attendees why."}
            </DialogDescription>
          </DialogHeader>

          {mode === "details" ? (
            <div className="mt-6 space-y-3">
              <DetailRow
                icon={<CalendarClock size={16} />}
                label="Date"
                value={dates ? formatIstDate(dates.start) : "—"}
              />
              <DetailRow
                icon={<Clock size={16} />}
                label="Time (IST)"
                value={
                  dates
                    ? `${formatIstTime(dates.start)} – ${formatIstTime(dates.end)}`
                    : "—"
                }
              />
              <DetailRow
                icon={<Users size={16} />}
                label="Attendees"
                value={event?.attendee ?? "—"}
              />
              <DetailRow
                icon={<MapPin size={16} />}
                label="Location"
                value={event?.location ?? "—"}
              />

              <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode("reschedule")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-info px-4 py-3 text-sm font-bold text-info-foreground shadow-lg shadow-info/25 transition hover:scale-[1.02] hover:shadow-xl"
                >
                  <RotateCcw size={16} /> Reschedule
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (event?.id) {
                      try {
                        await fetch(`/api/meetings/${event.id}/cancel`, { method: "PUT" });
                        toast.success("Meeting declined", {
                          description: "Attendees will be notified.",
                        });
                        window.location.reload(); // Refresh the page to show the update
                      } catch (err) {
                        toast.error("Failed to cancel meeting.");
                      }
                    }
                    onOpenChange(false);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-bold text-destructive-foreground shadow-lg shadow-destructive/25 transition hover:scale-[1.02] hover:shadow-xl"
                >
                  <XCircle size={16} /> Decline / Cancel
                </button>
              </div>
            </div>
          ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (event?.id) {
                  const formData = new FormData(e.currentTarget);
                  try {
                    await fetch(`/api/meetings/${event.id}/reschedule`, {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        start_time: formData.get("start"),
                        end_time: formData.get("end"),
                        reason: formData.get("reason"),
                      }),
                    });
                    toast.success("Reschedule request sent", {
                      description: "We'll notify you once it's confirmed.",
                    });
                    window.location.reload(); // Refresh the page to show the update
                  } catch (err) {
                    toast.error("Failed to reschedule meeting.");
                  }
                }
                onOpenChange(false);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    New start
                  </span>
                  <input
                    type="datetime-local"
                    name="start"
                    required
                    defaultValue={dates?.start ? new Date(dates.start.getTime() - dates.start.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    New end
                  </span>
                  <input
                    type="datetime-local"
                    name="end"
                    required
                    defaultValue={dates?.end ? new Date(dates.end.getTime() - dates.end.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="space-y-2">
                <span className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Reason
                </span>
                <input
                  type="text"
                  name="reason"
                  required
                  placeholder="Conflicting client review…"
                  className={inputClass}
                />
              </label>

              <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-[auto_1fr]">
                <button
                  type="button"
                  onClick={() => setMode("details")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-foreground neu-inset transition hover:text-primary"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 transition hover:scale-[1.02] hover:shadow-xl"
                >
                  Send request
                </button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl neu-inset px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-sm">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
