import { create } from 'zustand'

export interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  meeting: string;
  email: string;
}

export interface Meeting {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  is_teams: boolean;
}

export interface Member {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: string;
}

interface AppState {
  tasks: Task[];
  meetings: Meeting[];
  members: Member[];
  isMobileMenuOpen: boolean;
  setTasks: (tasks: Task[]) => void;
  setMeetings: (meetings: Meeting[]) => void;
  updateTaskStatus: (id: number, status: string) => void;
  toggleMobileMenu: () => void;
  fetchMembers: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  tasks: [],
  meetings: [],
  members: [],
  isMobileMenuOpen: false,
  setTasks: (tasks) => set({ tasks }),
  setMeetings: (meetings) => set({ meetings }),
  updateTaskStatus: (id, status) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, status } : t)
  })),
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  fetchMembers: async () => {
    if (get().members.length > 0) return; // already fetched
    try {
      const res = await fetch("/sync/api/org-members", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((m: any) => ({
          id: m.mail || m.userPrincipalName, // Tasks use email for assigneeId
          name: m.displayName,
          initials: m.displayName.slice(0, 2).toUpperCase(),
          email: m.mail || m.userPrincipalName,
          role: m.jobTitle || "Member"
        })).filter((m: any) => m.id); // Must have email
        set({ members: mapped });
      }
    } catch (e) {
      console.error(e);
    }
  }
}))
