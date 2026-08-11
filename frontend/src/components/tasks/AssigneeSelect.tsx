import { useMemo, useState, useEffect } from "react";
import { Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

export function AssigneeSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const { members, fetchMembers } = useStore();

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter(
      (u) => !q || u.name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q),
    );
  }, [query, members]);

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.map((id) => {
          const user = members.find(m => m.id === id);
          if (!user) return null;
          return (
            <span
              key={id}
              className="neu-raised flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-xs font-medium"
            >
              <span className="grid size-6 place-items-center rounded-full bg-primary/12 text-[10px] font-bold text-primary">
                {user.initials}
              </span>
              {user.name}
              <button
                type="button"
                aria-label={`Remove ${user.name}`}
                onClick={() => toggle(id)}
                className="text-muted-foreground hover:text-primary"
              >
                <X className="size-3.5" />
              </button>
            </span>
          );
        })}
        {value.length === 0 && (
          <span className="text-xs text-muted-foreground">No one allocated yet.</span>
        )}
      </div>

      <div className="neu-inset flex items-center gap-2 rounded-xl px-3 py-2">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search teammates…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <ul className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
        {results.map((user) => {
          const selected = value.includes(user.id);
          return (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => toggle(user.id)}
                className={cn(
                  "neu-press flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left",
                  selected ? "neu-raised" : "hover:bg-muted/60",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">
                  {user.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{user.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {user.role}
                  </span>
                </span>
                {selected && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            </li>
          );
        })}
        {results.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-muted-foreground">No matches.</li>
        )}
      </ul>
    </div>
  );
}
