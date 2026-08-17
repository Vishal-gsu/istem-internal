import { KanbanSquare, Video, CalendarDays, Users } from "lucide-react";
import { Reveal } from "./Reveal";

const features = [
  {
    icon: KanbanSquare,
    title: "Projects & Issues",
    body: "Track milestones, manage tasks, and organize team issues with intuitive Kanban boards.",
  },
  {
    icon: CalendarDays,
    title: "Calendar & Schedule",
    body: "A unified timeline for all tasks, meetings, and team events, keeping everyone synced.",
  },
  {
    icon: Video,
    title: "Meeting Hub",
    body: "Run focused sessions with agendas, take live notes, and track follow-ups directly in the hub.",
  },
  {
    icon: Users,
    title: "Team & Admin",
    body: "Manage members securely, control access levels, and handle team approvals smoothly.",
  },
];

export function Features() {
  return (
    <section id="features" className="w-full py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Everything internal
          </span>
          <h2 className="mt-4 font-display text-[clamp(1.9rem,3.6vw,2.9rem)] font-extrabold leading-tight tracking-tight text-foreground">
            One hub for the work behind the work
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Purpose-built modules that replace scattered spreadsheets, chat threads, and inbox
            approvals.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <article className="flex h-full flex-col rounded-[1.75rem] neu-raised neu-lift p-7">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl neu-inset text-primary">
                  <f.icon size={22} />
                </span>
                <h3 className="mt-6 font-display text-lg font-bold tracking-tight text-foreground">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
