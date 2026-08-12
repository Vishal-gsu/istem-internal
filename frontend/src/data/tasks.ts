export type Priority = "high" | "medium" | "low";
export type Status = "todo" | "in-progress" | "done" | "tentative" | "blocked" | "waiting-client" | "pending_review";

export type User = {
  id: string;
  name: string;
  initials: string;
  role: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assigneeIds: string[];
  dependsOn: string[];
  parentId: string | null;
  weight: number;
  meetingId?: string | null;
  projectId?: string | null;
  start: string;
  due?: string;
  targetDate?: string;
  hardDeadline?: string;
  estimatedHours?: number;
  assignorEmail?: string;
};

export const users: User[] = [
  { id: "u1", name: "Aarav Menon", initials: "AM", role: "Product Lead" },
  { id: "u2", name: "Sana Qureshi", initials: "SQ", role: "Design" },
  { id: "u3", name: "Diego Ramos", initials: "DR", role: "Engineering" },
  { id: "u4", name: "Lin Wei", initials: "LW", role: "Accessibility" },
  { id: "u5", name: "Priya Nair", initials: "PN", role: "Research" },
  { id: "u6", name: "Tom Becker", initials: "TB", role: "QA" },
];

export const statusLabels: Record<Status, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
  tentative: "Tentative",
  blocked: "Blocked",
  "waiting-client": "Waiting on Client",
  pending_review: "Pending Review"
};

export const initialTasks: Task[] = [
  {
    id: "t1",
    title: "Accessibility audit — Learner Portal",
    description:
      "Full WCAG 2.2 AA sweep across the learner portal, including screen reader traversal and keyboard-only journeys.",
    status: "in-progress",
    priority: "high",
    assigneeIds: ["u4", "u3"],
    dependsOn: [],
    parentId: null,
    weight: 100,
    start: "2026-08-03",
    due: "2026-08-21",
  },
  {
    id: "t2",
    title: "Screen reader traversal report",
    description: "Document NVDA and VoiceOver findings for the top ten learner flows.",
    status: "in-progress",
    priority: "medium",
    assigneeIds: ["u4"],
    dependsOn: [],
    parentId: "t1",
    weight: 40,
    start: "2026-08-05",
    due: "2026-08-14",
  },
  {
    id: "t3",
    title: "Remediation backlog grooming",
    description: "Turn audit findings into scoped engineering tickets with severity ratings.",
    status: "todo",
    priority: "medium",
    assigneeIds: ["u1"],
    dependsOn: ["t2"],
    parentId: "t1",
    weight: 60,
    start: "2026-08-15",
    due: "2026-08-24",
  },
  {
    id: "t4",
    title: "Design approval — Planner refresh",
    description: "Sign-off on the neumorphic planner surface, motion spec and token set.",
    status: "done",
    priority: "high",
    assigneeIds: ["u2"],
    dependsOn: [],
    parentId: null,
    weight: 20,
    start: "2026-07-27",
    due: "2026-08-06",
  },
  {
    id: "t5",
    title: "Build task allocation flow",
    description: "Multi-assignee selection with searchable directory and live workload hints.",
    status: "todo",
    priority: "high",
    assigneeIds: ["u3", "u1"],
    dependsOn: ["t4"],
    parentId: null,
    weight: 100,
    start: "2026-08-10",
    due: "2026-08-26",
  },
  {
    id: "t6",
    title: "Dependency graph engine",
    description: "Resolve blocked-by chains and surface cycles before they reach the board.",
    status: "todo",
    priority: "low",
    assigneeIds: ["u3"],
    dependsOn: ["t5"],
    parentId: "t5",
    weight: 100,
    start: "2026-08-18",
    due: "2026-09-02",
  },
  {
    id: "t7",
    title: "Interview 8 partner institutions",
    description: "Understand planning rituals across partner campuses before locking the roadmap.",
    status: "in-progress",
    priority: "medium",
    assigneeIds: ["u5"],
    dependsOn: [],
    parentId: null,
    weight: 50,
    start: "2026-08-01",
    due: "2026-08-19",
  },
  {
    id: "t8",
    title: "Regression pass — Q3 release",
    description: "End-to-end sweep of planner, calendar and meetings before the Q3 cut.",
    status: "done",
    priority: "medium",
    assigneeIds: ["u6", "u3"],
    dependsOn: [],
    parentId: null,
    weight: 80,
    start: "2026-07-20",
    due: "2026-08-04",
  },
];

export const userById = (id: string) => users.find((u) => u.id === id);
