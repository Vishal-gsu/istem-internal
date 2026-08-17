"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RotateCcw, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DeclineModalProps {
  meetingId: string | number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeclineModal({ meetingId, open, onOpenChange, onSuccess }: DeclineModalProps) {
  const router = useRouter();
  const [remark, setRemark] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDecline = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/sync/api/decline-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          meeting_id: typeof meetingId === "string" ? parseInt(meetingId, 10) : meetingId,
          remark: remark || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Meeting declined.");
        onOpenChange(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error("Failed to decline meeting.");
      }
    } catch (err) {
      toast.error("Network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReschedule = () => {
    onOpenChange(false);
    router.push(`/schedule?rebook_id=${meetingId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-0 neu-raised p-6 sm:p-8">
        <DialogHeader className="text-left space-y-2">
          <DialogTitle className="text-2xl font-display font-extrabold text-foreground tracking-tight">
            Decline Meeting
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Do you want to cancel the meeting entirely, or propose a new schedule?
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2 block">
              Remark / Reason (Optional)
            </span>
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g., Conflict with another meeting..."
              className="w-full rounded-2xl border-0 neu-inset px-4 py-3 text-sm font-medium text-foreground outline-none transition-shadow focus:ring-2 focus:ring-primary/40"
            />
          </label>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={handleReschedule}
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-info px-4 py-3 text-sm font-bold text-info-foreground shadow-lg shadow-info/25 transition hover:scale-[1.02]"
            >
              <RotateCcw size={16} /> Propose Reschedule
            </button>
            <button
              onClick={handleDecline}
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 px-4 py-3 text-sm font-bold text-destructive transition hover:bg-destructive/10 hover:scale-[1.02]"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              Decline & Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
