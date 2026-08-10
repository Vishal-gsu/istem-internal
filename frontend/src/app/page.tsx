"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useStore } from "../store/useStore";
import { useAuth } from "../components/AuthProvider";

export default function Dashboard() {
  const { user: account } = useAuth();
  
  const { tasks, meetings, setTasks, setMeetings, updateTaskStatus } = useStore();
  const [loading, setLoading] = useState(true);
  const [pendingMeetings, setPendingMeetings] = useState<any[]>([]);
  
  // State for adding manual tasks
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userEmail = account?.username || "";
        const tasksUrl = userEmail ? `/api/tasks?email=${userEmail}` : "/api/tasks";
        const meetingsUrl = userEmail ? `/api/meetings?email=${userEmail}` : "/api/meetings";
        const approvalsUrl = userEmail ? `/api/pending-approvals?email=${userEmail}` : null;
        
        const [tasksRes, meetingsRes] = await Promise.all([
          fetch(tasksUrl, { credentials: "include" }),
          fetch(meetingsUrl, { credentials: "include" })
        ]);
        
        if (tasksRes.ok) setTasks(await tasksRes.json());
        if (meetingsRes.ok) setMeetings(await meetingsRes.json());
        
        if (approvalsUrl) {
          const appRes = await fetch(approvalsUrl, { credentials: "include" });
          if (appRes.ok) setPendingMeetings(await appRes.json());
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    if (account) {
       fetchData();
    }
  }, [setTasks, setMeetings, account]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !account?.username) return;
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle,
          status: "todo",
          priority: "normal",
          email: account.username
        })
      });
      if (response.ok) {
        setNewTaskTitle("");
        setIsAddingTask(false);
        const tasksRes = await fetch(`/api/tasks?email=${account.username}`, { credentials: "include" });
        setTasks(await tasksRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const onDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("taskId", id.toString());
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = async (e: React.DragEvent, status: string) => {
    const id = parseInt(e.dataTransfer.getData("taskId"));
    updateTaskStatus(id, status);
    try {
      await fetch(`/api/tasks/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status })
      });
    } catch (err) {
      console.error("Failed to save task status", err);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rust-600"></div>
      </div>
    );
  }

  const todoTasks = tasks.filter(t => t.status === "todo");
  const inProgressTasks = tasks.filter(t => t.status === "in-progress");
  const doneTasks = tasks.filter(t => t.status === "done");

  const firstName = account?.name?.split(" ")[0] || "there";
  
  const handleApprove = async (id: number) => {
    try {
      await fetch("/api/approve-meeting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ meeting_id: id })
      });
      // Refresh Data
      const appRes = await fetch(`/api/pending-approvals?email=${account?.username}`, { credentials: "include" });
      if (appRes.ok) setPendingMeetings(await appRes.json());
      
      const meetingsRes = await fetch(`/api/meetings?email=${account?.username}`, { credentials: "include" });
      if (meetingsRes.ok) setMeetings(await meetingsRes.json());
      
    } catch (err) {
      console.error(err);
    }
  };
  
  // Widget Data
  const upcomingMeetings = meetings.filter((m: any) => !m.status.includes('Cancelled')).slice(0, 3);
  const todaysEvents = meetings.filter((m: any) => new Date(m.start_time).toDateString() === new Date().toDateString()).slice(0, 5);

  return (
    <div className="max-w-screen-2xl mx-auto h-full flex flex-col pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back, {firstName}!</h1>
        <p className="text-slate-500 mt-2">Here is your schedule and preparation tasks for today.</p>
      </div>

      {/* VIP Approvals Section */}
      {pendingMeetings.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <h2 className="text-sm font-bold text-yellow-800 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            You have {pendingMeetings.length} meetings pending VIP Approval!
          </h2>
          <div className="flex items-center gap-2">
            {pendingMeetings.map(pm => (
               <button key={pm.id} onClick={() => handleApprove(pm.id)} className="bg-yellow-600 text-white py-1.5 px-3 rounded text-xs font-bold hover:bg-yellow-700 transition-colors shadow-sm">
                  Approve: {pm.title}
               </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-6 flex-1 min-h-0">
        
        {/* LEFT SIDE: Kanban Board (65%) */}
        <div className="xl:w-2/3 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[700px] xl:h-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center">
              <svg className="w-6 h-6 mr-2 text-rust-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              My Kanban Board
            </h2>
          </div>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
            {/* Column: To Do */}
            <div className="flex flex-col bg-slate-50 rounded-lg p-3 border border-slate-100" onDragOver={onDragOver} onDrop={(e) => onDrop(e, "todo")}>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
                To Do
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{todoTasks.length}</span>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                
                {/* Add Task UI */}
                {isAddingTask ? (
                  <form onSubmit={handleCreateTask} className="bg-white p-3 rounded-lg border border-rust-300 shadow-sm">
                    <input 
                      type="text" autoFocus className="w-full text-sm border-b border-slate-200 focus:border-rust-500 focus:outline-none py-1 mb-2" 
                      placeholder="What needs to be done?" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button type="button" onClick={() => setIsAddingTask(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                      <button type="submit" className="text-xs bg-rust-600 text-white px-2 py-1 rounded hover:bg-rust-700">Add</button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setIsAddingTask(true)} className="w-full text-left text-sm text-slate-500 hover:text-rust-700 font-medium p-2 border border-transparent hover:border-slate-200 hover:bg-white rounded-lg transition-all flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add a task
                  </button>
                )}

                {todoTasks.map(task => (
                  <div key={task.id} draggable onDragStart={(e) => onDragStart(e, task.id)} onClick={() => setSelectedTask(task)} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-rust-400 hover:shadow-md transition-all duration-200 group">
                    {task.priority === 'high' && <span className="inline-block px-2 py-0.5 bg-rust-900 text-white text-[10px] font-bold rounded mb-2 uppercase tracking-wide">High Priority</span>}
                    <p className="text-sm font-bold text-slate-800 group-hover:text-rust-700 transition-colors">{task.title}</p>
                    {task.meeting && (
                      <p className="text-[11px] text-slate-500 mt-2 flex items-center truncate bg-slate-50 p-1 rounded border border-slate-100">
                        <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="truncate">{task.meeting}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Column: In Progress */}
            <div className="flex flex-col bg-rust-50/50 rounded-lg p-3 border border-rust-100" onDragOver={onDragOver} onDrop={(e) => onDrop(e, "in-progress")}>
              <h3 className="text-sm font-semibold text-rust-900 mb-3 flex items-center justify-between">
                In Progress
                <span className="bg-rust-200 text-rust-800 px-2 py-0.5 rounded-full text-xs">{inProgressTasks.length}</span>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                 {inProgressTasks.map(task => (
                  <div key={task.id} draggable onDragStart={(e) => onDragStart(e, task.id)} onClick={() => setSelectedTask(task)} className="bg-white p-3 rounded-lg border border-rust-200 shadow-sm cursor-grab active:cursor-grabbing hover:border-rust-400 hover:shadow-md transition-all duration-200">
                    <p className="text-sm font-bold text-slate-800">{task.title}</p>
                    {task.meeting && (
                      <p className="text-[11px] text-slate-500 mt-2 flex items-center truncate bg-slate-50 p-1 rounded border border-slate-100">
                        <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="truncate">{task.meeting}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Column: Done */}
            <div className="flex flex-col bg-slate-50 rounded-lg p-3 border border-slate-100" onDragOver={onDragOver} onDrop={(e) => onDrop(e, "done")}>
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center justify-between">
                Done
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{doneTasks.length}</span>
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                 {doneTasks.map(task => (
                  <div key={task.id} draggable onDragStart={(e) => onDragStart(e, task.id)} onClick={() => setSelectedTask(task)} className="bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-grab active:cursor-grabbing opacity-70 hover:opacity-100 transition-opacity">
                    <p className="text-sm font-bold text-slate-500 line-through">{task.title}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT SIDE: Widgets (35%) */}
        <div className="xl:w-1/3 flex flex-col gap-6">
          
          {/* Widget 1: Upcoming Meetings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
               <h3 className="font-bold text-slate-900">Upcoming Meetings</h3>
               <Link href="/meetings" className="text-xs text-rust-600 font-bold hover:underline">View Hub &rarr;</Link>
             </div>
             <div className="space-y-3">
               {upcomingMeetings.length === 0 && <p className="text-sm text-slate-400 italic">No upcoming meetings.</p>}
               {upcomingMeetings.map((m:any) => (
                 <Link href="/meetings" key={m.id} className="block group">
                   <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 group-hover:border-rust-300 group-hover:bg-rust-50 transition-colors">
                     <p className="text-sm font-bold text-slate-800 group-hover:text-rust-700">{m.title}</p>
                     <p className="text-xs text-slate-500 mt-1">{new Date(m.start_time).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                   </div>
                 </Link>
               ))}
             </div>
          </div>

          {/* Widget 2: Calendar Snapshot */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col flex-1">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
               <h3 className="font-bold text-slate-900">Today's Schedule Snapshot</h3>
               <Link href="/calendar" className="text-xs text-rust-600 font-bold hover:underline flex items-center">
                 Full Calendar
                 <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
               </Link>
             </div>
             <div className="space-y-4 flex-1">
               {todaysEvents.length === 0 && <p className="text-sm text-slate-400 italic">Your day is clear!</p>}
               {todaysEvents.map((m:any) => (
                 <Link href="/calendar" key={m.id} className="block group">
                   <div className="flex items-start gap-3 p-2 -mx-2 rounded hover:bg-slate-50 transition-colors">
                     <div className="w-2 h-2 mt-1.5 rounded-full bg-rust-500 shrink-0 group-hover:scale-125 transition-transform"></div>
                     <div className="flex-1">
                       <p className="text-sm font-bold text-slate-800 group-hover:text-rust-700">{m.title}</p>
                       <p className="text-xs text-slate-500">{new Date(m.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                     </div>
                     <div className="text-slate-300 group-hover:text-rust-500 transition-colors mt-1">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                     </div>
                   </div>
                 </Link>
               ))}
             </div>
          </div>

          {/* Widget 3: Quick Links */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
             <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
               <h3 className="font-bold text-slate-900">Quick Links</h3>
             </div>
             <div className="grid grid-cols-2 gap-3">
               <Link href="/schedule" className="bg-rust-600 text-white text-center py-3 rounded-lg text-xs font-bold hover:bg-rust-700 transition-colors shadow-sm">
                  + New Meeting
               </Link>
               <Link href="/members" className="bg-slate-100 text-slate-700 text-center py-3 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200">
                  Org Directory
               </Link>
               <Link href="/admin" className="bg-slate-100 text-slate-700 text-center py-3 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors border border-slate-200 col-span-2">
                  Admin Settings
               </Link>
             </div>
          </div>

        </div>

      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <h3 className="font-bold text-slate-900 text-lg pr-4">{selectedTask.title}</h3>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none shrink-0">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedTask.status} 
                    onChange={(e) => {
                      updateTaskStatus(selectedTask.id, e.target.value);
                      fetch(`/api/tasks/${selectedTask.id}/status`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ status: e.target.value })
                      });
                      setSelectedTask({...selectedTask, status: e.target.value});
                    }}
                    className="border border-slate-300 rounded p-1.5 text-sm font-medium bg-slate-50"
                  >
                    <option value="todo">To Do</option>
                    <option value="in-progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>
              
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Priority</p>
                <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded uppercase tracking-wide ${selectedTask.priority === 'high' ? 'bg-rust-900 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {selectedTask.priority}
                </span>
              </div>

              {selectedTask.meeting && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Related Meeting</p>
                  <p className="text-sm text-slate-800 bg-slate-50 p-2 rounded border border-slate-200 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {selectedTask.meeting}
                  </p>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedTask(null)} className="bg-slate-900 text-white px-6 py-2 rounded font-medium text-sm hover:bg-slate-800 transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
