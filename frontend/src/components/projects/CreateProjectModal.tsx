import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type CreateProjectModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function CreateProjectModal({ open, onOpenChange, onSuccess }: CreateProjectModalProps) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          location,
          start_time: new Date().toISOString()
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create project");
      }

      onSuccess();
      onOpenChange(false);
      setTitle("");
      setLocation("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Project Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="neu-inset w-full rounded-xl bg-transparent px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Q3 Website Redesign"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Location / Details</label>
            <input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="neu-inset w-full rounded-xl bg-transparent px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Remote"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="neu-flat rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="neu-raised rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
              style={{ background: "var(--gradient-rust)" }}
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
