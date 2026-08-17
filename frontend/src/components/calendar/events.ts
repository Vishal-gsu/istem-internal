export type EventStatus = "scheduled" | "pending";

export interface CalendarEvent {
  id: string;
  title: string;
  attendee: string;
  location: string;
  status: EventStatus;
  /** 0 = Monday ... 6 = Sunday */
  day: number;
  /** decimal hours, e.g. 9.5 = 09:30 */
  start: number;
  end: number;
  is_vip?: boolean;
}

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const START_HOUR = 8;
export const END_HOUR = 20;

export const EVENTS: CalendarEvent[] = [
  {
    id: "e1",
    title: "Sprint Planning — Platform",
    attendee: "Product Guild",
    location: "Meet · Room Terra",
    status: "scheduled",
    day: 0,
    start: 9.5,
    end: 10.5,
  },
  {
    id: "e2",
    title: "Accessibility Audit Review",
    attendee: "Nikhil & QA pod",
    location: "Zoom",
    status: "scheduled",
    day: 0,
    start: 14,
    end: 15,
  },
  {
    id: "e3",
    title: "VIP Partner Intro Call",
    attendee: "Awaiting confirmation",
    location: "Google Meet",
    status: "pending",
    day: 1,
    start: 11,
    end: 12,
  },
  {
    id: "e4",
    title: "Design Critique — Kanban",
    attendee: "Design + Eng",
    location: "Room Sienna",
    status: "scheduled",
    day: 1,
    start: 16,
    end: 17,
  },
  {
    id: "e5",
    title: "Hiring Panel · Frontend",
    attendee: "Talent team",
    location: "Meet",
    status: "scheduled",
    day: 2,
    start: 10,
    end: 11.5,
  },
  {
    id: "e6",
    title: "Board Sync (VIP)",
    attendee: "Pending approval",
    location: "Executive Suite",
    status: "pending",
    day: 3,
    start: 9,
    end: 10,
  },
  {
    id: "e7",
    title: "Weekly Ops Standup",
    attendee: "All leads",
    location: "Room Clay",
    status: "scheduled",
    day: 3,
    start: 13,
    end: 13.75,
  },
  {
    id: "e8",
    title: "Roadmap Retrospective",
    attendee: "Program office",
    location: "Zoom",
    status: "scheduled",
    day: 4,
    start: 15,
    end: 16.5,
  },
  {
    id: "e9",
    title: "Investor Brief (VIP)",
    attendee: "Pending confirmation",
    location: "Meet",
    status: "pending",
    day: 4,
    start: 11.5,
    end: 12.5,
  },
  {
    id: "e10",
    title: "Deep Work · Reminder Engine",
    attendee: "Solo focus block",
    location: "Anywhere",
    status: "scheduled",
    day: 5,
    start: 10,
    end: 12,
  },
];

export function startOfWeek(date: Date) {
  const d = new Date(date);
  const dow = (d.getDay() + 6) % 7; // Monday-first
  d.setDate(d.getDate() - dow);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function eventDates(event: CalendarEvent, weekStart: Date) {
  const base = new Date(weekStart);
  base.setDate(base.getDate() + event.day);
  // Values are IST wall-clock hours; build the matching UTC instant (IST = UTC+5:30)
  const toDate = (value: number) =>
    new Date(
      Date.UTC(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        Math.floor(value) - 5,
        Math.round((value % 1) * 60) - 30,
      ),
    );
  return { start: toDate(event.start), end: toDate(event.end) };
}

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
  timeZone: "Asia/Kolkata",
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Asia/Kolkata",
});

export const formatIstTime = (d: Date) => timeFormatter.format(d);
export const formatIstDate = (d: Date) => dateFormatter.format(d);

export const formatHourLabel = (hour: number) => {
  const suffix = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
};
