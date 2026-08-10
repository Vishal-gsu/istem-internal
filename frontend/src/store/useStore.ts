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

interface AppState {
  tasks: Task[];
  meetings: Meeting[];
  setTasks: (tasks: Task[]) => void;
  setMeetings: (meetings: Meeting[]) => void;
  updateTaskStatus: (id: number, status: string) => void;
}

export const useStore = create<AppState>((set) => ({
  tasks: [],
  meetings: [],
  setTasks: (tasks) => set({ tasks }),
  setMeetings: (meetings) => set({ meetings }),
  updateTaskStatus: (id, status) => set((state) => ({
    tasks: state.tasks.map(t => t.id === id ? { ...t, status } : t)
  })),
}))
