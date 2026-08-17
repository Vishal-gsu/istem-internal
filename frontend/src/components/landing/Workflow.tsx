import { Reveal } from "./Reveal";

const steps = [
  {
    n: "01",
    title: "Organize",
    body: "Create projects and log issues directly into the team workspace.",
  },
  {
    n: "02",
    title: "Assign",
    body: "Delegate tasks, set deadlines, and balance workloads across the team.",
  },
  {
    n: "03",
    title: "Sync",
    body: "Schedule meetings, capture notes, and track actionable outcomes.",
  },
  {
    n: "04",
    title: "Deliver",
    body: "Monitor progress through a unified dashboard and deliver results on time.",
  },
];

export function Workflow() {
  return (
    <section id="workflow" className="w-full pb-8 sm:pb-12">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 110}>
              <div className="flex h-full items-start gap-5 rounded-[1.75rem] bg-card/70 p-7 shadow-sm neu-lift">
                <span className="font-display text-3xl font-extrabold text-primary/35">{s.n}</span>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
