import { Reveal } from "./Reveal";

const steps = [
  {
    n: "01",
    title: "Plan",
    body: "Build the week on a shared board — tasks, owners, and capacity in one view.",
  },
  {
    n: "02",
    title: "Meet",
    body: "Run focused sessions with agendas attached and decisions captured live.",
  },
  {
    n: "03",
    title: "Approve",
    body: "Send sign-offs to the VIP desk and track every step of the audit trail.",
  },
];

export function Workflow() {
  return (
    <section id="workflow" className="w-full pb-8 sm:pb-12">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
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
