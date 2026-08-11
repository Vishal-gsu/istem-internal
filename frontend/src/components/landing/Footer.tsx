import { Sparkles } from "lucide-react";

const columns = [
  { title: "Modules", links: ["Tasks", "Meetings", "Approvals", "Reminders"] },
  { title: "Team", links: ["Directory", "Departments", "On-call", "Policies"] },
  { title: "Support", links: ["Help desk", "IT requests", "Status", "Feedback"] },
];

export function Footer() {
  return (
    <footer className="w-full border-t border-border py-14">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles size={18} />
              </span>
              <span className="truncate font-display text-base font-extrabold tracking-tight text-foreground">
                I-STEM Internal
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Scheduling, meetings, and task management for the I-STEM team.
            </p>
          </div>

          {columns.map((c) => (
            <div key={c.title} className="min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-foreground">
                {c.title}
              </h3>
              <ul className="mt-4 space-y-3">
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#top"
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} I-STEM. Internal use only.
          </p>
          <p className="text-xs text-muted-foreground">Built for the I-STEM operations team</p>
        </div>
      </div>
    </footer>
  );
}
