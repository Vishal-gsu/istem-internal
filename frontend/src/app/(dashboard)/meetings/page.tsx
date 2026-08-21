"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarX2,
  Clock,
  LayoutGrid,
  List,
  Play,
  RotateCcw,
  Search,
  Video,
  Check,
  X,
} from "lucide-react";
import { Reveal } from "@/components/dashboard/Reveal";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/components/AuthProvider";
import { DeclineModal } from "@/components/meetings/DeclineModal";
import { MeetingDetailModal } from "@/components/meetings/MeetingDetailModal";

type Status = "Confirmed" | "Pending" | "Past" | "Cancelled";
type Bucket = "Upcoming" | "Past" | "Needs Review" | "Cancelled";

export type MeetingUI = {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  start_time: string;
  end_time: string;
  status: Status;
  bucket: Bucket;
  organizer_email: string;
  attendees: { name: string; initials: string; email?: string }[];
  recording?: boolean;
};

const FILTERS = ["All", "Upcoming", "Past", "Needs Review", "Cancelled"] as const;

const STATUS_STYLES: Record<Status, string> = {
  Confirmed: "bg-success/15 text-success",
  Pending: "bg-warning/20 text-warning-foreground",
  Past: "bg-muted text-muted-foreground",
  Cancelled: "bg-destructive/12 text-destructive",
};

function AvatarStack({ people }: { people: MeetingUI["attendees"] }) {
  const shown = people.slice(0, 4);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <span
          key={p.name}
          title={p.name}
          className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold text-primary-foreground ring-2 ring-card"
          style={{ background: "var(--gradient-rust)", marginLeft: i === 0 ? 0 : -10 }}
        >
          {p.initials}
        </span>
      ))}
      {rest > 0 && (
        <span
          className="neu-inset grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold text-muted-foreground"
          style={{ marginLeft: -10 }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}

function TimePill({ m }: { m: MeetingUI }) {
  return (
    <span className="neu-inset inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground">
      <Clock className="h-3.5 w-3.5" />
      {m.date} · {m.time} · {m.duration}
    </span>
  );
}

function Actions({ m, account, onRefresh, compact = false, onDecline }: { m: MeetingUI; account: any; onRefresh: () => void; compact?: boolean; onDecline?: (id: number) => void }) {
  const upcoming = m.bucket === "Upcoming" || m.bucket === "Needs Review";
  const router = useRouter();
  if (m.bucket === "Cancelled") {
    return (
      <button onClick={(e) => { e.stopPropagation(); router.push(`/schedule?rebook_id=${m.id}`); }} className="neu-press inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground">
        <RotateCcw className="h-4 w-4" /> Rebook
      </button>
    );
  }
  if (m.bucket === "Needs Review") {
    const isVipUser = m.attendees.some((a: any) => a.email?.toLowerCase() === account?.username?.toLowerCase() && a.is_vip);
    if (isVipUser) {
      return (
        <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/approve-meeting`, {
                method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
                body: JSON.stringify({ meeting_id: parseInt(m.id) })
              });
              onRefresh();
            }}
            className="neu-press inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-2 text-xs font-semibold text-success"
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </button>

        <button onClick={(e) => { e.stopPropagation(); router.push(`/schedule?rebook_id=${m.id}`); }} className="neu-press inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground">
          <RotateCcw className="h-4 w-4" /> Reschedule
        </button>
      </div>
    );
  }
  }
  return (
    <button onClick={(e) => { e.stopPropagation(); alert('Opening details view...'); }} className="neu-press inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-foreground">
      <Play className="h-4 w-4 text-primary" />
      {m.recording ? "Watch Recording" : "View Notes"}
    </button>
  );
}


export default function MeetingsPage() {
  const { user: account } = useAuth();
  const { meetings, setMeetings } = useStore();
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [declineMeetingId, setDeclineMeetingId] = useState<number | null>(null);

  const fetchMeetings = async () => {
    try {
      const userEmail = account?.username || "";
      const meetingsUrl = userEmail ? `${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/meetings?email=${userEmail}` : `${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/meetings`;
      const res = await fetch(meetingsUrl, { credentials: "include" });
      if (res.ok) {
        setMeetings(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [account]);

  const mappedMeetings: MeetingUI[] = useMemo(() => {
    return meetings.map((m: any) => {
      const startDate = new Date(m.start_time);
      const isPast = startDate < new Date();
      
      let status: Status = "Confirmed";
      let bucket: Bucket = "Upcoming";

      if (m.status.includes("Cancelled") || m.status.includes("Declined")) {
        status = "Cancelled";
        bucket = "Cancelled";
      } else if (m.status.includes("Pending")) {
        status = "Pending";
        bucket = "Needs Review";
      } else if (isPast) {
        status = "Past";
        bucket = "Past";
      } else {
        status = "Confirmed";
        bucket = "Upcoming";
      }

      return {
        id: String(m.id),
        title: m.title,
        date: startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        duration: m.duration_minutes ? `${m.duration_minutes}m` : "30m",
        start_time: m.start_time,
        end_time: m.end_time || m.start_time,
        status,
        bucket,
        organizer_email: m.organizer_email,
        attendees: (m.attendees || []).map((a: any) => ({
          name: a.email.split("@")[0],
          initials: a.email.substring(0, 2).toUpperCase(),
          email: a.email,
          is_vip: a.is_vip
        })),
        recording: isPast
      };
    });
  }, [meetings, account]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mappedMeetings.filter((m) => {
      const inFilter = filter === "All" || m.bucket === filter;
      const inQuery =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.attendees.some((a) => a.name.toLowerCase().includes(q));
      return inFilter && inQuery;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [query, filter, mappedMeetings]);

  if (loading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto w-full max-w-[1800px] px-4 pb-24 pt-8 sm:px-6 lg:px-10">
        <Reveal>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Meetings Hub</h1>
            <p className="text-muted-foreground">
              Your entire meeting history and upcoming syncs.
            </p>
          </div>
        </Reveal>

        <Reveal delay={80} className="mt-8">
          <div className="neu-inset flex items-center gap-3 rounded-3xl px-5 py-4 transition-shadow focus-within:ring-4 focus-within:ring-primary/40">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search meetings by title or attendee…"
              aria-label="Search meetings"
              className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
          </div>
        </Reveal>

        <Reveal delay={140} className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((f) => {
                const active = filter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    aria-pressed={active}
                    className={`neu-press rounded-full px-4 py-2 text-sm transition-all ${
                      active
                        ? "font-semibold text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={active ? { background: "var(--gradient-rust)" } : undefined}
                  >
                    {f}
                  </button>
                );
              })}
            </div>

            <div className="neu-inset flex items-center gap-1 rounded-full p-1">
              {(
                [
                  { key: "grid", label: "Grid view", Icon: LayoutGrid },
                  { key: "list", label: "List view", Icon: List },
                ] as const
              ).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setView(key)}
                  aria-label={label}
                  aria-pressed={view === key}
                  className={`grid h-9 w-11 place-items-center rounded-full transition-all ${
                    view === key ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                  style={view === key ? { background: "var(--gradient-rust)" } : undefined}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {results.length === 0 ? (
          <Reveal delay={120} className="mt-12">
            <div className="neu-raised mx-auto flex max-w-xl flex-col items-center gap-4 rounded-4xl px-8 py-16 text-center">
              <span className="neu-inset grid h-20 w-20 place-items-center rounded-full">
                <CalendarX2 className="h-8 w-8 text-muted-foreground/60" />
              </span>
              <h2 className="text-xl font-semibold">No meetings found in this category.</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Try a different search term or switch filters to see more of your schedule.
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  setFilter("All");
                }}
                className="neu-press mt-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-rust)" }}
              >
                Clear filters
              </button>
            </div>
          </Reveal>
        ) : view === "grid" ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((m, i) => (
              <Reveal key={m.id} delay={i * 70}>
                <article 
                  onClick={() => setSelectedMeetingId(m.id)}
                  className="neu-raised cursor-pointer text-left flex h-full flex-col gap-5 rounded-4xl p-6 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-3">
                    <TimePill m={m} />
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_STYLES[m.status]}`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <h2 className="font-display text-lg font-semibold leading-snug">{m.title}</h2>

                  <div className="mt-auto flex items-center justify-between gap-3">
                    <AvatarStack people={m.attendees} />
                    <span className="text-xs text-muted-foreground">
                      {m.attendees.length} attendees
                    </span>
                  </div>

                  <Actions m={m} account={account} onRefresh={fetchMeetings} onDecline={setDeclineMeetingId} />
                </article>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            {results.map((m, i) => (
              <Reveal key={m.id} delay={i * 60}>
                <article 
                  onClick={() => setSelectedMeetingId(m.id)}
                  className="neu-raised cursor-pointer text-left flex flex-col gap-5 rounded-3xl p-5 transition-transform duration-300 hover:-translate-y-1 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <TimePill m={m} />
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${STATUS_STYLES[m.status]}`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <h2 className="truncate font-display text-lg font-semibold">{m.title}</h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-5">
                    <AvatarStack people={m.attendees} />
                    <Actions m={m} account={account} onRefresh={fetchMeetings} compact onDecline={setDeclineMeetingId} />
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
        
        <MeetingDetailModal 
          meeting={mappedMeetings.find(m => m.id === selectedMeetingId) || null} 
          onClose={() => setSelectedMeetingId(null)} 
        />
        
        {declineMeetingId && (
          <DeclineModal
            meetingId={declineMeetingId}
            open={!!declineMeetingId}
            onOpenChange={(open) => {
              if (!open) setDeclineMeetingId(null);
            }}
            onSuccess={fetchMeetings}
          />
        )}
      </main>
    </div>
  );
}
