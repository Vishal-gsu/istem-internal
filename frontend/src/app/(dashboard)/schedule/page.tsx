"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock, Search, Send, Users, X, CheckCircle2, CalendarDays, Filter } from "lucide-react";
import { Reveal } from "@/components/dashboard/Reveal";
import { Combobox } from "@/components/ui/Combobox";

const TYPES = ["Internal Sync", "Client Review", "Vendor", "VIP Approval"];
const DURATIONS = Array.from({ length: 24 }, (_, i) => (i + 1) * 15);
const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
];

type Person = { id: string; name: string; role: string; initials: string; email: string };
type AttendeeState = { id: string; is_vip: boolean; task: string };
type WizardStep = "details" | "slots" | "booked";

function Avatar({ initials, size = "h-8 w-8" }: { initials: string; size?: string }) {
  return (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-full text-[11px] font-bold text-primary-foreground shadow-sm`}
      style={{ background: "var(--gradient-rust)" }}
    >
      {initials}
    </span>
  );
}

export default function SchedulePage() {
  const today = new Date();
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState<number | null>(today.getDate());
  
  const [title, setTitle] = useState("");
  const [type, setType] = useState(TYPES[0]);
  const [duration, setDuration] = useState(30);
  const [time, setTime] = useState("");
  
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [attendees, setAttendees] = useState<AttendeeState[]>([]);
  
  const [wizardStep, setWizardStep] = useState<WizardStep>("details");
  const [isSearching, setIsSearching] = useState(false);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);

  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string>("none");

  useEffect(() => {
    fetch("/api/org-members", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map((u: any) => ({
            id: u.id || u.mail,
            name: u.displayName || u.mail,
            role: u.jobTitle || "Member",
            initials: (u.displayName || u.mail || "?").substring(0, 2).toUpperCase(),
            email: u.mail || ""
          }));
          setPeople(mapped);
        }
      })
      .catch(console.error);

    fetch("/api/projects", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setProjects(data);
        }
      })
      .catch(console.error);
  }, []);

  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1).getDay();
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    return [...Array<null>(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [cursor]);

  const searchResults = people.filter(
    (p) => !attendees.some(a => a.id === p.id) && (p.name.toLowerCase().includes(query.toLowerCase()) || p.email.toLowerCase().includes(query.toLowerCase())),
  );

  const shift = (dir: number) => {
    const d = new Date(cursor.y, cursor.m + dir, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(null);
  };

  const handleFindTimes = async () => {
    if (!title) return alert("Please enter a meeting title.");
    if (attendees.length === 0) return alert("Please add at least one attendee.");
    if (!selected) return alert("Please select a date.");

    setIsSearching(true);
    try {
      const payload = {
        attendees: attendees.map(a => {
          const p = people.find(x => x.id === a.id);
          return { email: p?.email || "", is_vip: a.is_vip, prep_task: a.task };
        }),
        duration: `PT${duration}M`,
        protect_lunch: false,
        date: `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(selected).padStart(2, '0')}`,
        time: time,
        mode: "nearest"
      };

      const res = await fetch("/api/find-meeting-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });
      
      if (res.ok) {
        const data = await res.json();
        setSlots(data.meetingTimeSuggestions || []);
        setWizardStep("slots");
      } else {
        alert("Error finding meeting times.");
      }
    } catch(e) {
      console.error(e);
      alert("Network error.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookMeeting = async () => {
    if (!selectedSlot) return alert("Please pick a slot.");
    setIsSearching(true);
    try {
      // Fix potential missing 'Z' from graph API response
      const startStr = selectedSlot.meetingTimeSlot.start.dateTime;
      const endStr = selectedSlot.meetingTimeSlot.end.dateTime;
      
      const payload = {
        title,
        start_time: startStr.endsWith('Z') ? startStr : startStr + "Z",
        end_time: endStr.endsWith('Z') ? endStr : endStr + "Z",
        project_id: projectId === "none" ? null : parseInt(projectId, 10),
        attendees: attendees.map(a => {
          const p = people.find(x => x.id === a.id);
          return { email: p?.email || "", is_vip: a.is_vip, prep_task: a.task };
        })
      };

      const res = await fetch("/api/schedule-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      if (res.ok) {
        setWizardStep("booked");
      } else {
        alert("Error scheduling meeting.");
      }
    } catch(e) {
      console.error(e);
      alert("Network error.");
    } finally {
      setIsSearching(false);
    }
  };

  const renderProgress = () => {
    const STEPS = ["Parameters", "Find & Assign", "Booked"];
    let stepIdx = 0;
    if (wizardStep === "slots") stepIdx = 1;
    if (wizardStep === "booked") stepIdx = 2;

    return (
      <ol className="mx-auto mt-8 flex max-w-md items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-all duration-300 ${
                i <= stepIdx ? "neu-press text-primary" : "neu-inset text-muted-foreground"
              }`}
              style={i <= stepIdx ? { background: "var(--gradient-rust)", color: "white" } : {}}
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-background/60 text-[10px]">
                {i < stepIdx ? <Check className="h-3 w-3 text-foreground" /> : i + 1}
              </span>
              <span className="truncate">{s}</span>
            </div>
          </li>
        ))}
      </ol>
    );
  };

  return (
    <div className="w-full min-h-[90vh]">
      <div className="mx-auto w-full max-w-[1800px] px-4 pb-40 pt-10 sm:px-6 lg:px-10">
        <div
          aria-hidden
          className="pointer-events-none fixed left-1/2 top-24 -z-10 h-64 w-64 -translate-x-1/2 rounded-full opacity-40 blur-3xl animate-float-slow"
          style={{ background: "var(--gradient-rust)" }}
        />

        <Reveal>
          <header className="text-center">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Schedule a Meeting
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Smart scheduling with Microsoft Graph and soft-conflict resolution.
            </p>
          </header>
        </Reveal>

        <Reveal delay={80}>
          {renderProgress()}
        </Reveal>

        {wizardStep === "details" && (
          <Reveal delay={140}>
            <section className="neu-raised w-full mt-8 rounded-4xl p-6 sm:p-10 lg:p-12">
              
              {/* Title & Type */}
              <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
                <div className="flex flex-col gap-6 xl:col-span-1">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Meeting title
                    </span>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="E.g., Platform sync"
                      className="neu-inset mt-3 w-full rounded-2xl px-5 py-4 text-lg font-medium outline-none transition-shadow placeholder:text-muted-foreground/70 focus:ring-4 focus:ring-primary/40"
                    />
                  </label>
                  
                  <div className="block z-20">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
                      Link to Project (Optional)
                    </span>
                    <Combobox
                      options={[
                        { value: "none", label: "No Project (Standalone Meeting)" },
                        ...projects.map(p => ({ value: String(p.id), label: p.title }))
                      ]}
                      value={projectId}
                      onChange={setProjectId}
                    />
                  </div>
                </div>

                <div className="xl:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Meeting type
                  </span>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {TYPES.map((t) => {
                      const active = t === type;
                      return (
                        <button
                          key={t}
                          onClick={() => setType(t)}
                          className={`neu-press rounded-full px-6 py-3 text-sm font-semibold transition-all ${
                            active ? "text-primary-foreground" : "text-muted-foreground"
                          }`}
                          style={active ? { background: "var(--gradient-rust)" } : {}}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Attendees */}
              <div className="mt-10">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  <Users className="h-4 w-4" /> Attendees & VIP Status (Click pill to make VIP)
                </span>
                
                <div className="neu-inset rounded-3xl p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    {attendees.map((a) => {
                      const p = people.find((x) => x.id === a.id)!;
                      const isVip = a.is_vip;
                      return (
                        <button
                          key={a.id}
                          onClick={() => setAttendees(prev => prev.map(x => x.id === a.id ? { ...x, is_vip: !x.is_vip } : x))}
                          className={`neu-press flex items-center gap-2 rounded-full py-2 pl-2 pr-4 text-sm animate-rise transition-all duration-300 ${isVip ? "shadow-lg scale-105" : ""}`}
                          style={isVip ? { background: "var(--gradient-rust)", color: "white" } : { background: "rgba(var(--background), 0.6)" }}
                          title="Click to toggle VIP status"
                        >
                          <Avatar initials={p.initials} size="h-8 w-8" />
                          <span className="truncate font-medium">{p.name} {isVip && "👑"}</span>
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAttendees((prev) => prev.filter((x) => x.id !== a.id));
                            }}
                            className={`ml-1 grid h-5 w-5 place-items-center rounded-full hover:bg-black/20 ${isVip ? "text-white" : "text-muted-foreground hover:text-foreground"}`}
                          >
                            <X className="h-3 w-3" />
                          </span>
                        </button>
                      );
                    })}
                    <div className="relative flex-1 min-w-[250px]">
                      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search org members..."
                        className="w-full bg-transparent py-3 pl-12 pr-4 text-base outline-none placeholder:text-muted-foreground/70"
                      />
                    </div>
                  </div>

                  {query && (
                    <ul className="mt-4 max-h-60 overflow-y-auto space-y-1 border-t border-border/60 pt-4">
                      {searchResults.length === 0 && (
                        <li className="px-4 py-3 text-sm text-muted-foreground">No teammates found</li>
                      )}
                      {searchResults.map((p) => (
                        <li key={p.id}>
                          <button
                            onClick={() => {
                              setAttendees((a) => [...a, { id: p.id, is_vip: false, task: "" }]);
                              setQuery("");
                            }}
                            className="flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-secondary/60"
                          >
                            <Avatar initials={p.initials} size="h-10 w-10" />
                            <span className="min-w-0">
                              <span className="block truncate text-base font-medium">{p.name}</span>
                              <span className="block truncate text-sm text-muted-foreground">{p.role} · {p.email}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Date, Time, Duration Grid */}
              <div className="mt-10 grid gap-8 lg:grid-cols-2 xl:grid-cols-[minmax(auto,450px)_minmax(auto,400px)_1fr]">
                {/* Calendar */}
                <div className="min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
                    Preferred Date
                  </span>
                  <div className="neu-inset rounded-3xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <button onClick={() => shift(-1)} className="neu-press grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="font-display text-base font-bold">
                        {MONTHS[cursor.m]} {cursor.y}
                      </span>
                      <button onClick={() => shift(1)} className="neu-press grid h-10 w-10 place-items-center rounded-full text-muted-foreground hover:text-foreground">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-muted-foreground/70 mb-3">
                      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {grid.map((d, i) =>
                        d === null ? (
                          <span key={`e${i}`} />
                        ) : (
                          <button
                            key={d}
                            onClick={() => setSelected(d)}
                            className={`aspect-square rounded-full text-sm font-semibold transition-all duration-200 ${
                              selected === d
                                ? "text-primary-foreground shadow-md scale-110"
                                : "neu-press text-foreground/80 hover:text-primary hover:scale-105"
                            }`}
                            style={selected === d ? { background: "var(--gradient-rust)" } : {}}
                          >
                            {d}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </div>

                {/* Time slot scroller */}
                <div className="min-w-0 flex flex-col">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    <Clock className="h-4 w-4" /> Preferred Time
                  </span>
                  <div className="neu-inset h-[24rem] overflow-y-auto rounded-3xl p-4 scrollbar-hide">
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-2">
                      {Array.from({ length: 18 }, (_, i) => {
                        const total = 9 * 60 + i * 30;
                        return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
                      }).map((s) => {
                        const active = time === s;
                        return (
                          <button
                            key={s}
                            onClick={() => setTime(s)}
                            className={`neu-press rounded-xl py-3 text-sm font-semibold transition-all ${
                              active ? "text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                            }`}
                            style={active ? { background: "var(--gradient-rust)" } : {}}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Duration Scroller & Help Text */}
                <div className="min-w-0 flex flex-col">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
                    Duration (Minutes)
                  </span>
                  <div className="neu-inset rounded-3xl p-4 flex overflow-x-auto whitespace-nowrap scrollbar-hide snap-x gap-4 items-center h-[120px]">
                    {DURATIONS.map((d) => {
                      const active = duration === d;
                      return (
                        <button
                          key={d}
                          onClick={() => setDuration(d)}
                          className={`snap-center shrink-0 rounded-2xl px-8 py-4 text-base font-bold transition-all duration-300 ${
                            active ? "text-primary-foreground scale-105 shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          }`}
                          style={active ? { background: "var(--gradient-rust)" } : {}}
                        >
                          {d}m
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-auto p-6 rounded-3xl bg-secondary/30 border border-border/40">
                    <p className="text-base text-muted-foreground leading-relaxed">
                      By clicking <strong className="text-foreground">Find Meeting Times</strong>, the orchestrator will scan Microsoft Graph to locate the nearest slots around <strong className="text-foreground">{time || "any time"}</strong> on your chosen date.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="glass sticky bottom-4 mt-12 flex justify-end rounded-3xl p-3 shadow-xl">
                <button
                  onClick={handleFindTimes}
                  disabled={isSearching}
                  className={`neu-raised inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02] ${isSearching ? 'opacity-70' : ''}`}
                  style={{ background: "var(--gradient-rust)" }}
                >
                  {isSearching ? <span className="animate-spin mr-2">⟳</span> : <Search className="h-4 w-4" />}
                  {isSearching ? "Orchestrating..." : "Find Meeting Times"}
                </button>
              </div>
            </section>
          </Reveal>
        )}

        {wizardStep === "slots" && (
          <Reveal>
            <section className="neu-raised mx-auto mt-8 max-w-5xl rounded-4xl p-6 sm:p-10">
              <h2 className="text-2xl font-bold mb-6">Assign Tasks & Pick Slot</h2>
              
              <div className="grid lg:grid-cols-2 gap-10">
                {/* Slots Column */}
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Available Slots
                  </h3>
                  {slots.length === 0 ? (
                    <div className="neu-inset p-8 rounded-3xl text-center">
                      <p className="text-muted-foreground">No available slots found for the given criteria. Try another date or shorter duration.</p>
                      <button onClick={() => setWizardStep("details")} className="mt-4 text-primary font-bold text-sm">← Go back</button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2">
                      {slots.map((s, i) => {
                        const start = new Date(s.meetingTimeSlot.start.dateTime + "Z");
                        const end = new Date(s.meetingTimeSlot.end.dateTime + "Z");
                        const active = selectedSlot === s;
                        
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedSlot(s)}
                            className={`neu-press flex flex-col items-start gap-1 rounded-2xl p-4 transition-all text-left ${
                              active ? "text-primary-foreground" : ""
                            }`}
                            style={active ? { background: "var(--gradient-rust)" } : {}}
                          >
                            <span className="font-bold text-base">
                              {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {s.softConflict && (
                              <span className={`text-[11px] font-semibold ${active ? 'text-white/80' : 'text-warning'}`}>
                                ⚠ Soft Conflict: {s.conflictReason}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Tasks Column */}
                <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                    Delegate Prep Tasks
                  </h3>
                  <div className="space-y-4">
                    {attendees.map(a => {
                      const p = people.find((x) => x.id === a.id)!;
                      return (
                        <div key={a.id} className="neu-inset p-4 rounded-3xl">
                          <div className="flex items-center gap-2 mb-3">
                            <Avatar initials={p.initials} size="h-6 w-6" />
                            <span className="text-sm font-bold">{p.name} {a.is_vip && "👑"}</span>
                          </div>
                          <input
                            value={a.task}
                            onChange={(e) => setAttendees(prev => prev.map(x => x.id === a.id ? { ...x, task: e.target.value } : x))}
                            placeholder={`E.g., Prepare slides for ${p.name.split(' ')[0]}...`}
                            className="w-full bg-transparent border-b border-border/50 pb-2 text-sm outline-none focus:border-primary transition-colors"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="glass sticky bottom-4 mt-12 flex justify-between items-center rounded-3xl p-3 shadow-xl">
                <button onClick={() => setWizardStep("details")} className="neu-press px-6 py-3 rounded-2xl text-sm font-bold text-muted-foreground">
                  Back
                </button>
                <button
                  onClick={handleBookMeeting}
                  disabled={isSearching || !selectedSlot}
                  className={`neu-raised inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-[1.02] ${(isSearching || !selectedSlot) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ background: "var(--gradient-rust)" }}
                >
                  {isSearching ? <span className="animate-spin mr-2">⟳</span> : <CheckCircle2 className="h-4 w-4" />}
                  {isSearching ? "Booking..." : "Book Meeting"}
                </button>
              </div>
            </section>
          </Reveal>
        )}

        {wizardStep === "booked" && (
          <Reveal>
            <section className="neu-raised mx-auto mt-20 max-w-xl rounded-4xl p-10 text-center flex flex-col items-center">
              <div className="grid h-24 w-24 place-items-center rounded-full neu-inset text-success mb-6">
                <CalendarDays className="h-10 w-10 animate-bounce" />
              </div>
              <h2 className="text-3xl font-bold mb-3">Meeting Orchestrated!</h2>
              <p className="text-muted-foreground mb-8">
                Your meeting has been successfully booked in Microsoft Graph. Teams invites have been sent and preparation tasks have been assigned.
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="neu-press px-6 py-3 rounded-2xl text-sm font-bold text-muted-foreground"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => {
                    setWizardStep("details");
                    setTitle("");
                    setAttendees([]);
                    setSelectedSlot(null);
                  }}
                  className="neu-raised px-8 py-3 rounded-2xl text-sm font-bold text-primary-foreground"
                  style={{ background: "var(--gradient-rust)" }}
                >
                  Schedule Another
                </button>
              </div>
            </section>
          </Reveal>
        )}

      </div>
    </div>
  );
}
