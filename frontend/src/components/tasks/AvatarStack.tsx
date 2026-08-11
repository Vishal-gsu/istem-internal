import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useEffect } from "react";

export function AvatarStack({ ids, className }: { ids: string[]; className?: string }) {
  const { members, fetchMembers } = useStore();

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const shown = ids.slice(0, 3);
  const extra = ids.length - shown.length;

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {shown.map((id) => {
        const user = members.find(m => m.id === id);
        if (!user) return null;
        return (
          <span
            key={id}
            title={user.name}
            className="grid size-7 shrink-0 place-items-center rounded-full bg-card text-[10px] font-bold text-foreground ring-2 ring-background"
            style={{ boxShadow: "2px 2px 6px var(--neu-dark), -2px -2px 6px var(--neu-light)" }}
          >
            {user.initials}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background">
          +{extra}
        </span>
      )}
      {ids.length === 0 && (
        <span className="text-xs text-muted-foreground">Unassigned</span>
      )}
    </div>
  );
}
