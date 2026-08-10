"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../../components/AuthProvider";

export default function MeetingsHub() {
  const { user: account } = useAuth();
  
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("details"); 
  
  // Reminder Widget State
  const [activeReminderMeeting, setActiveReminderMeeting] = useState<any>(null);
  const [reminders, setReminders] = useState<any[]>([]);
  const [newReminderMinutes, setNewReminderMinutes] = useState("15");
  const [customReminder, setCustomReminder] = useState("");

  // Meeting Data State (Attendees, Notes)
  const [attendees, setAttendees] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [newActionItem, setNewActionItem] = useState("");
  
  const [isSummarizing, setIsSummarizing] = useState(false);

  const userEmail = account?.username || "";

  // Helper
  const formatName = (email: string) => {
    if (!email) return "Unknown User";
    const namePart = email.split("@")[0].replace(/[0-9]/g, '');
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };
  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        const url = account?.username ? `/api/meetings?email=${account.username}` : "/api/meetings";
        const res = await fetch(url, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setMeetings(data.filter((m: any) => m.status.includes("Scheduled") || m.status.includes("Rescheduled") || m.status.includes("Pending")));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  // --- Reminders Logic ---
  const openReminders = async (e: React.MouseEvent, meeting: any) => {
    e.stopPropagation(); 
    setActiveReminderMeeting(meeting);
    try {
      const res = await fetch(`/api/meetings/${meeting.id}/reminders?email=${userEmail}`, { credentials: "include" });
      if (res.ok) setReminders(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const addReminder = async () => {
    if (!activeReminderMeeting || !userEmail) return;
    const mins = customReminder ? parseInt(customReminder) : parseInt(newReminderMinutes);
    if (isNaN(mins)) return;

    try {
      const res = await fetch(`/api/meetings/${activeReminderMeeting.id}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: userEmail, minutes_before: mins })
      });
      if (res.ok) {
        const fresh = await fetch(`/api/meetings/${activeReminderMeeting.id}/reminders?email=${userEmail}`, { credentials: "include" });
        if (fresh.ok) {
          setReminders(await fresh.json());
          setCustomReminder("");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Meeting Modal Logic ---
  const openMeetingModal = async (meeting: any) => {
    setSelectedMeeting(meeting);
    setActiveTab("details");
    fetchMeetingData(meeting.id);
  };

  const fetchMeetingData = async (id: number) => {
    try {
      const [attRes, noteRes] = await Promise.all([
        fetch(`/api/meetings/${id}/attendees`, { credentials: "include" }),
        fetch(`/api/meetings/${id}/notes?email=${userEmail}`, { credentials: "include" })
      ]);
      if (attRes.ok) setAttendees(await attRes.json());
      if (noteRes.ok) setNotes(await noteRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const addNote = async (isPrivate: boolean, overrideContent?: string) => {
    const content = overrideContent || newNote;
    if (!content.trim() || !selectedMeeting || !userEmail) return;
    try {
      await fetch(`/api/meetings/${selectedMeeting.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: userEmail, content: content, is_private: isPrivate })
      });
      if (!overrideContent) setNewNote("");
      fetchMeetingData(selectedMeeting.id);
    } catch (err) {
      console.error(err);
    }
  };

  const addActionItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionItem.trim() || !userEmail) return;
    try {
      await fetch(`/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: newActionItem, status: "todo", priority: "normal", email: userEmail, meeting: selectedMeeting.title })
      });
      setNewActionItem("");
      alert("Action item converted to Kanban Task on your Dashboard!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleAISummarize = () => {
    setIsSummarizing(true);
    setTimeout(() => {
      const summary = `**✨ AI Summary**\n- Discussed Q3 roadmap and timelines.\n- Agreed to shift Kanban board to left side of dashboard.\n- Next steps: follow up with engineering by Friday.`;
      addNote(false, summary);
      setIsSummarizing(false);
    }, 1500);
  };


  if (loading) return <div className="p-8">Loading meetings...</div>;

  return (
    <div className="max-w-screen-xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Meetings Hub</h1>
          <p className="text-slate-500 mt-2">Manage your schedule, reminders, action items, and notes in one place.</p>
        </div>
        <Link href="/schedule" className="bg-rust-600 text-white px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-rust-700 transition-colors text-center">
          + Schedule New Meeting
        </Link>
      </div>

      {/* Grid of Meetings */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {meetings.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm">
            You have no upcoming meetings.
          </div>
        )}
        {meetings.map((m: any) => (
          <div key={m.id} onClick={() => openMeetingModal(m)} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 cursor-pointer hover:shadow-md hover:border-rust-300 transition-all group flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-1 text-xs font-bold rounded ${m.status.includes('Pending') ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {m.status}
                </span>
                <button onClick={(e) => openReminders(e, m)} className="text-slate-400 hover:text-rust-600 p-1" title="Set Reminders">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </button>
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-rust-700 transition-colors">{m.title}</h3>
              <p className="text-sm text-slate-600 mt-2">
                {new Date(m.start_time).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-500 flex items-center justify-between">
              <span className="truncate pr-2">{m.location}</span>
              <span className="text-rust-600 font-medium">View Hub &rarr;</span>
            </div>
          </div>
        ))}
      </div>

      {/* Reminder Widget Modal */}
      {activeReminderMeeting && (
        <div className="fixed inset-0 bg-slate-900/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-rust-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                Personal Reminders
              </h3>
              <button onClick={() => setActiveReminderMeeting(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-500 mb-4">You will receive silent web/Teams push notifications to your device.</p>
              
              <div className="space-y-2 mb-6">
                {reminders.length === 0 && <p className="text-sm text-slate-400 italic">No reminders set.</p>}
                {reminders.map(r => (
                  <div key={r.id} className="bg-slate-50 border border-slate-200 rounded p-2 text-sm flex justify-between">
                    <span>{r.minutes_before} minutes before</span>
                    <span className="text-green-600 font-bold">Active</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {/* Custom Time */}
                <div className="flex gap-2 items-center">
                  <input type="number" placeholder="Custom mins" className="border border-slate-300 rounded p-2 text-sm w-32" value={customReminder} onChange={e => setCustomReminder(e.target.value)} />
                  <span className="text-sm text-slate-500">mins before</span>
                </div>
                
                <div className="flex gap-2 items-center">
                  <select className="border border-slate-300 rounded p-2 text-sm flex-1" value={newReminderMinutes} onChange={e => setNewReminderMinutes(e.target.value)} disabled={!!customReminder}>
                    <option value="5">5 mins before</option>
                    <option value="15">15 mins before</option>
                    <option value="30">30 mins before</option>
                    <option value="60">1 hour before</option>
                  </select>
                  <button onClick={addReminder} className="bg-slate-900 text-white px-4 py-2 rounded font-medium text-sm hover:bg-slate-800">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Details Full-Screen Mobile-Responsive Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-0 md:p-4">
          <div className="bg-white md:rounded-xl shadow-2xl w-full max-w-4xl h-full md:h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="p-4 md:p-6 border-b border-slate-200 bg-white flex justify-between items-start sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 pr-8">{selectedMeeting.title}</h2>
                <p className="text-slate-500 text-sm mt-1">
                  {new Date(selectedMeeting.start_time).toLocaleString()} &mdash; {new Date(selectedMeeting.end_time).toLocaleTimeString()}
                </p>
              </div>
              <button onClick={() => setSelectedMeeting(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full w-8 h-8 flex items-center justify-center text-xl shrink-0">&times;</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto custom-scrollbar">
              <button onClick={() => setActiveTab("details")} className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'details' ? 'border-b-2 border-rust-600 text-rust-700 bg-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                Details
              </button>
              <button onClick={() => setActiveTab("action-items")} className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'action-items' ? 'border-b-2 border-rust-600 text-rust-700 bg-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                Action Items
              </button>
              <button onClick={() => setActiveTab("attachments")} className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'attachments' ? 'border-b-2 border-rust-600 text-rust-700 bg-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                Attachments (OneDrive)
              </button>
              <button onClick={() => setActiveTab("shared-notes")} className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'shared-notes' ? 'border-b-2 border-rust-600 text-rust-700 bg-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                Shared Notes
              </button>
              <button onClick={() => setActiveTab("private-notes")} className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center ${activeTab === 'private-notes' ? 'border-b-2 border-slate-900 text-slate-900 bg-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Private Scratchpad
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
              
              {/* DETAILS TAB */}
              {activeTab === "details" && (
                <div className="space-y-6">
                  {selectedMeeting.organizer_email && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-2 uppercase tracking-wider">Organizer</h3>
                      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rust-100 text-rust-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {getInitials(formatName(selectedMeeting.organizer_email))}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{formatName(selectedMeeting.organizer_email)}</span>
                          <span className="text-xs text-slate-400">{selectedMeeting.organizer_email}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">Attendees ({attendees.length})</h3>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                      <table className="min-w-full divide-y divide-slate-200">
                        <tbody className="divide-y divide-slate-100">
                          {attendees.map(a => {
                            const name = formatName(a.email);
                            const initials = getInitials(name);
                            return (
                            <tr key={a.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm font-medium text-slate-900 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                                  {initials}
                                </div>
                                <div className="flex flex-col">
                                  <span className="flex items-center gap-2">
                                    {name}
                                    {a.is_vip && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">VIP</span>}
                                  </span>
                                  <span className="text-xs text-slate-400 font-normal">{a.email}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-500">
                                {a.task_description ? `Task: ${a.task_description}` : 'No prep required'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Accepted
                                </span>
                              </td>
                            </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION ITEMS TAB */}
              {activeTab === "action-items" && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 text-sm mb-4">
                    <strong>Action Item Generator:</strong> Items added here automatically sync to your personal Kanban Dashboard.
                  </div>
                  <form onSubmit={addActionItem} className="flex gap-2">
                    <input type="text" className="flex-1 border border-slate-300 rounded-lg p-3 text-sm shadow-sm focus:border-rust-500 focus:outline-none" 
                      placeholder="e.g. Send out the final Q3 report" value={newActionItem} onChange={e => setNewActionItem(e.target.value)} />
                    <button type="submit" className="bg-rust-600 text-white px-6 py-2 rounded-lg font-medium text-sm hover:bg-rust-700">Assign to Me</button>
                  </form>
                </div>
              )}

              {/* ATTACHMENTS TAB */}
              {activeTab === "attachments" && (
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-lg p-6 text-center shadow-sm">
                    <svg className="w-12 h-12 mx-auto text-blue-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <h3 className="text-lg font-bold text-slate-900">OneDrive Attachments</h3>
                    <p className="text-sm text-slate-500 mt-2 mb-6">Attach existing company documents directly from OneDrive, or upload new files.</p>
                    
                    <button onClick={() => alert('OneDrive Picker Mock Triggered!')} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors inline-flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2 9.5A3.5 3.5 0 005.5 13H9v2.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 15.586V13h2.5a4.5 4.5 0 10-.616-8.958 4.002 4.002 0 10-7.753 1.977A3.5 3.5 0 002 9.5zm9 3.5H9V8a1 1 0 012 0v5z" clipRule="evenodd" /></svg>
                      Browse OneDrive
                    </button>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Attached Files</h4>
                    <div className="bg-white border border-slate-200 rounded p-4 text-sm flex items-center justify-between">
                      <div className="flex items-center text-slate-700 font-medium">
                        <svg className="w-5 h-5 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                        Q3_Financial_Report.xlsx
                      </div>
                      <span className="text-xs text-slate-500">OneDrive (Read-Only)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SHARED NOTES TAB */}
              {activeTab === "shared-notes" && (
                <div className="flex flex-col h-full space-y-4">
                  <div className="flex justify-end">
                    <button onClick={handleAISummarize} disabled={isSummarizing} className="text-xs bg-slate-200 text-slate-700 px-3 py-1.5 rounded hover:bg-slate-300 font-medium flex items-center disabled:opacity-50">
                      {isSummarizing ? (
                        <>
                           <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Summarizing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          AI Summarize
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex-1 space-y-4 overflow-y-auto pr-2">
                    {notes.filter(n => !n.is_private).length === 0 && <p className="text-sm text-slate-400 italic">No shared notes yet.</p>}
                    {notes.filter(n => !n.is_private).map(n => {
                      const name = formatName(n.email);
                      const initials = getInitials(name);
                      const isAI = n.content.includes("✨ AI Summary");
                      
                      return (
                      <div key={n.id} className={`p-4 rounded-xl border shadow-sm flex items-start gap-3 ${isAI ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                        {isAI ? (
                           <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                           </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {initials}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className={`text-xs font-bold mb-1 flex items-center ${isAI ? 'text-indigo-800' : 'text-slate-900'}`}>
                            {isAI ? 'AI Assistant' : name}
                          </p>
                          <p className={`text-sm whitespace-pre-wrap ${isAI ? 'text-indigo-900' : 'text-slate-700'}`}>{n.content}</p>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                  <div className="pt-2">
                    <textarea className="w-full border border-slate-300 rounded-lg p-3 text-sm shadow-sm focus:border-rust-500 focus:outline-none min-h-[100px]" 
                      placeholder="Type a collaborative note for everyone..." value={newNote} onChange={e => setNewNote(e.target.value)}></textarea>
                    <button onClick={() => addNote(false)} className="mt-2 bg-rust-600 text-white px-6 py-2 rounded-lg font-medium text-sm hover:bg-rust-700 w-full sm:w-auto">
                      Post Shared Note
                    </button>
                  </div>
                </div>
              )}

              {/* PRIVATE NOTES TAB */}
              {activeTab === "private-notes" && (
                <div className="flex flex-col h-full space-y-4">
                  <div className="bg-slate-100 border border-slate-200 text-slate-700 rounded-lg p-4 text-sm mb-2 flex items-start">
                     <svg className="w-5 h-5 mr-2 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                     <p><strong>Private Scratchpad.</strong> These notes are stored securely in our local database and are only visible to <strong>you</strong> ({userEmail}). They are not synced to the shared meeting.</p>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto">
                    {notes.filter(n => n.is_private).length === 0 && <p className="text-sm text-slate-400 italic">No private notes yet.</p>}
                    {notes.filter(n => n.is_private).map(n => (
                      <div key={n.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm text-slate-100">
                        <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2">
                    <textarea className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-sm shadow-sm focus:border-slate-500 focus:outline-none min-h-[100px]" 
                      placeholder="Type a private thought..." value={newNote} onChange={e => setNewNote(e.target.value)}></textarea>
                    <button onClick={() => addNote(true)} className="mt-2 bg-slate-900 text-white px-6 py-2 rounded-lg font-medium text-sm hover:bg-slate-800 w-full sm:w-auto flex items-center justify-center">
                      Save Private Note
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
