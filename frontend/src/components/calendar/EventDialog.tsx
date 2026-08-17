"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { DeclineModal } from "@/components/meetings/DeclineModal";
import { useState } from "react";

interface EventDialogProps {
  event: CalendarEvent | null;
  dates: { start: Date; end: Date } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const inputClass =
  "w-full rounded-xl border-0 neu-inset px-4 py-3 text-sm font-medium text-foreground outline-none ring-primary/40 transition focus:ring-2";

export function EventDialog({ event, dates, open, onOpenChange }: EventDialogProps) {
  const router = useRouter();
  const [showDecline, setShowDecline] = useState(false);

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
              Review the meeting details below, then reschedule or cancel.
            </DialogDescription>
          </DialogHeader>

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
                {pending && event?.is_vip ? (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        if (event?.id) {
                          try {
                            await fetch("/sync/api/approve-meeting", {
                              method: "POST", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ meeting_id: parseInt(event.id) })
                            });
                            toast.success("Meeting approved!");
                            window.location.reload();
                          } catch (err) {
                            toast.error("Failed to approve meeting.");
                          }
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-success/15 px-4 py-3 text-sm font-bold text-success shadow-lg shadow-success/10 transition hover:scale-[1.02] hover:bg-success/25"
                    >
                      <CheckCircle2 size={16} /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDecline(true)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-destructive/40 px-4 py-3 text-sm font-bold text-destructive shadow-lg shadow-destructive/10 transition hover:scale-[1.02] hover:bg-destructive/10"
                    >
                      <XCircle size={16} /> Decline
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (event?.id) {
                          onOpenChange(false);
                          router.push(`/schedule?rebook_id=${event.id}`);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-info px-4 py-3 text-sm font-bold text-info-foreground shadow-lg shadow-info/25 transition hover:scale-[1.02] hover:shadow-xl"
                    >
                      <RotateCcw size={16} /> Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (event?.id) {
                          try {
                            await fetch(`/sync/api/meetings/${event.id}/cancel`, { method: "PUT" });
                            toast.success("Meeting cancelled", {
                              description: "Attendees will be notified.",
                            });
                            window.location.reload();
                          } catch (err) {
                            toast.error("Failed to cancel meeting.");
                          }
                        }
                        onOpenChange(false);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-bold text-destructive-foreground shadow-lg shadow-destructive/25 transition hover:scale-[1.02] hover:shadow-xl"
                    >
                      <XCircle size={16} /> Cancel Meeting
                    </button>
                  </>
                )}
              </div>
            </div>
        </div>
      </DialogContent>

      {showDecline && event?.id && (
        <DeclineModal
          meetingId={event.id}
          open={showDecline}
          onOpenChange={(o) => {
            if (!o) setShowDecline(false);
          }}
          onSuccess={() => {
            onOpenChange(false);
            window.location.reload();
          }}
        />
      )}
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
