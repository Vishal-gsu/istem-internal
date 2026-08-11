import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Calendar, Video, RotateCcw, Play, FileText, Users, Link2, CheckCircle, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import type { MeetingUI } from "@/app/(dashboard)/meetings/page";

const STATUS_STYLES: Record<MeetingUI["status"], string> = {
  Confirmed: "bg-success/15 text-success",
  Pending: "bg-warning/20 text-warning-foreground",
  Past: "bg-muted text-muted-foreground",
  Cancelled: "bg-destructive/12 text-destructive",
};

export function MeetingDetailModal({
  meeting,
  onClose,
}: {
  meeting: MeetingUI | null;
  onClose: () => void;
}) {
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"details" | "reschedule" | "rebook">("details");

  useEffect(() => {
    if (meeting?.id) {
      setLoading(true);
      fetch(`/api/meetings/${meeting.id}/attendees`)
        .then((res) => res.json())
        .then((data) => {
          setAttendees(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [meeting?.id]);

  if (!meeting) return null;

  const upcoming = meeting.bucket === "Upcoming" || meeting.bucket === "Needs Review";

  return (
    <Dialog open={!!meeting} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="neu-glass max-h-[90vh] overflow-y-auto rounded-3xl border-0 p-0 sm:max-w-2xl">
        {/* Header Area with Status */}
        <div className="flex flex-col gap-4 p-6 sm:p-8 pb-4">
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${STATUS_STYLES[meeting.status]}`}
            >
              {meeting.status}
            </span>
            <div className="flex gap-2">
              <span className="neu-inset inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <Calendar className="size-3.5" />
                {meeting.date}
              </span>
              <span className="neu-inset inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                <Clock className="size-3.5" />
                {meeting.time}
              </span>
            </div>
          </div>
          <DialogTitle className="font-display text-2xl font-bold leading-tight sm:text-3xl">
            {meeting.title}
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Mail className="size-4" /> Organized by: {meeting.organizer_email}
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 sm:px-8 pb-8 space-y-8">
          
          {/* Attendees & Tasks */}
          <section>
            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Users className="size-4" /> Attendees & Assigned Tasks
            </h3>
            
            {loading ? (
              <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-3"></div>
                Loading attendees...
              </div>
            ) : attendees.length === 0 ? (
              <div className="neu-inset rounded-2xl p-5 text-sm text-muted-foreground text-center">
                No attendees found for this meeting.
              </div>
            ) : (
              <div className="neu-inset grid gap-3 rounded-2xl p-4 sm:grid-cols-2">
                {attendees.map((a, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-xl bg-card/40 p-3 shadow-sm border border-border/40">
                    <div className="flex items-center gap-3">
                      <span
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-primary-foreground shadow-md"
                        style={{ background: a.is_vip ? "var(--gradient-rust)" : "var(--color-slate-500, #64748b)" }}
                      >
                        {a.email.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="truncate font-medium text-sm text-foreground">{a.email}</span>
                        {a.is_vip && <span className="text-[10px] font-bold text-primary uppercase tracking-widest">VIP</span>}
                      </div>
                    </div>
                    {a.task_description && (
                      <div className="mt-1 flex items-start gap-2 text-xs text-muted-foreground bg-background/50 p-2 rounded-lg">
                        <CheckCircle className="size-3.5 shrink-0 mt-0.5 text-primary" />
                        <span className="leading-snug">{a.task_description}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Details & Agenda */}
          <section>
            <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <FileText className="size-4" /> Agenda & Notes
            </h3>
            <div className="neu-inset rounded-2xl p-5 text-sm text-muted-foreground/90 leading-relaxed space-y-3">
              <p>
                No specific agenda provided. 
                This is a {meeting.duration} meeting managed by the Microsoft Graph orchestrator.
              </p>
              {!upcoming && (
                <p className="italic text-foreground/70">
                  Notes from this meeting are not available yet.
                </p>
              )}
            </div>
          </section>

          {mode === "details" ? (
            <>
              {/* Action Footer */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {meeting.bucket === "Cancelled" && (
                  <button
                    onClick={() => setMode("rebook")}
                    className="neu-press inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-4" /> Rebook Meeting
                  </button>
                )}

                {upcoming && (
                  <>
                    <button
                      onClick={() => window.open("https://teams.microsoft.com", "_blank")}
                      className="neu-press inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-105"
                      style={{ background: "var(--gradient-rust)", boxShadow: "0 8px 20px -6px var(--rust)" }}
                    >
                      <Video className="size-4" /> Join Microsoft Teams
                    </button>
                    <button
                      onClick={() => setMode("reschedule")}
                      className="neu-press inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="size-4" /> Reschedule
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await fetch(`/api/meetings/${meeting.id}/cancel`, { method: "PUT" });
                          window.location.reload();
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="neu-press inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-destructive hover:text-destructive/80"
                    >
                      Cancel Meeting
                    </button>
                  </>
                )}

                {!upcoming && meeting.bucket !== "Cancelled" && (
                  <button
                    onClick={() => alert("Loading recording/notes...")}
                    className="neu-press inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-foreground"
                  >
                    <Play className="size-4 text-primary" />
                    {meeting.recording ? "Watch Recording" : "View Notes"}
                  </button>
                )}

                <button
                  onClick={() => alert("Copied link!")}
                  className="neu-inset ml-auto inline-flex items-center justify-center rounded-2xl p-3.5 text-muted-foreground hover:text-foreground"
                  title="Copy link"
                >
                  <Link2 className="size-4" />
                </button>
              </div>
            </>
          ) : (
            <form
              className="space-y-4 pt-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                try {
                  const endpoint = mode === "rebook" ? `/api/meetings/${meeting.id}/rebook` : `/api/meetings/${meeting.id}/reschedule`;
                  const method = mode === "rebook" ? "POST" : "PUT";
                  const body: any = {
                    start_time: formData.get("start"),
                    end_time: formData.get("end"),
                  };
                  if (mode === "reschedule") body.reason = formData.get("reason");
                  
                  await fetch(endpoint, {
                    method,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                  });
                  window.location.reload();
                } catch (err) {
                  console.error(err);
                }
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
                    defaultValue={mode === "reschedule" && meeting?.start_time ? new Date(new Date(meeting.start_time).getTime() - new Date(meeting.start_time).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                    className="w-full rounded-xl border-0 neu-inset px-4 py-3 text-sm font-medium text-foreground outline-none ring-primary/40 transition focus:ring-2"
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
                    defaultValue={mode === "reschedule" && meeting?.end_time ? new Date(new Date(meeting.end_time).getTime() - new Date(meeting.end_time).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                    className="w-full rounded-xl border-0 neu-inset px-4 py-3 text-sm font-medium text-foreground outline-none ring-primary/40 transition focus:ring-2"
                  />
                </label>
              </div>
              
              {mode === "reschedule" && (
                <label className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Reason
                  </span>
                  <input
                    type="text"
                    name="reason"
                    required
                    placeholder="Conflicting client review…"
                    className="w-full rounded-xl border-0 neu-inset px-4 py-3 text-sm font-medium text-foreground outline-none ring-primary/40 transition focus:ring-2"
                  />
                </label>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMode("details")}
                  className="neu-press inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-muted-foreground hover:text-foreground"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="neu-press inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-105"
                  style={{ background: "var(--gradient-rust)", boxShadow: "0 8px 20px -6px var(--rust)" }}
                >
                  {mode === "rebook" ? "Confirm Rebook" : "Send request"}
                </button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
