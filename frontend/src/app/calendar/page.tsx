"use client";

import { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useStore } from "../../store/useStore";
import { useAuth } from "../../components/AuthProvider";

export default function CalendarPage() {
  const { user: account } = useAuth();
  const { meetings, setMeetings } = useStore();
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [rescheduleData, setRescheduleData] = useState({ start: "", end: "", reason: "" });
  const [declineReason, setDeclineReason] = useState("");

  const fetchMeetings = async () => {
    try {
      // Step 1: Sync with Microsoft Graph quietly
      await fetch('/api/sync-calendar', { credentials: 'include' });
      
      // Step 2: Fetch the synced SQLite meetings
      const url = account?.username ? `/api/meetings?email=${account.username}` : "/api/meetings";
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        setMeetings(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch meetings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [setMeetings, account]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rust-600"></div>
      </div>
    );
  }

  const calendarEvents = meetings
    .filter((m: any) => !m.status.includes("Cancelled"))
    .map((m: any) => {
      const isPending = m.status.includes("Pending");
      return {
        id: m.id.toString(),
        title: isPending ? `(Pending) ${m.title}` : m.title,
        start: m.start_time,
        end: m.end_time,
        backgroundColor: isPending ? "#f59e0b" : "#c2410c",
        borderColor: isPending ? "#d97706" : "#c2410c",
        classNames: isPending ? ["opacity-80", "border-dashed", "border-2"] : [],
        extendedProps: {
          status: m.status,
          is_organizer: m.is_organizer,
          is_vip: m.is_vip
        }
      };
    });

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event);
    setIsRescheduling(false);
    setIsDeclining(false);
    setDeclineReason("");
    setRescheduleData({
      start: info.event.startStr.slice(0, 16),
      end: info.event.endStr.slice(0, 16),
      reason: ""
    });
  };

  const handleAccept = async () => {
    if (!selectedEvent) return;
    try {
      await fetch(`/api/approve-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ meeting_id: parseInt(selectedEvent.id) })
      });
      setSelectedEvent(null);
      fetchMeetings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelOrDecline = async () => {
    if (!selectedEvent) return;
    
    // For pending meetings, we force a reason
    if (selectedEvent.extendedProps.status.includes("Pending") && !declineReason) {
      alert("Please provide a remark for declining this meeting.");
      return;
    }
    
    if (!selectedEvent.extendedProps.status.includes("Pending") && !confirm("Are you sure you want to cancel this meeting?")) return;
    
    try {
      await fetch(`/api/meetings/${selectedEvent.id}/cancel`, { 
        method: "POST", 
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: declineReason })
      });
      setSelectedEvent(null);
      fetchMeetings();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReschedule = async () => {
    if (!selectedEvent || !rescheduleData.start || !rescheduleData.end || !rescheduleData.reason) {
      alert("Please fill in all fields including a reason.");
      return;
    }
    try {
      await fetch(`/api/meetings/${selectedEvent.id}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          new_start: new Date(rescheduleData.start).toISOString(),
          new_end: new Date(rescheduleData.end).toISOString(),
          reason: rescheduleData.reason
        })
      });
      setSelectedEvent(null);
      fetchMeetings();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto h-[calc(100vh-8rem)] flex flex-col pb-8 relative">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Calendar</h1>
          <p className="text-slate-500 mt-2">Click on any meeting to Reschedule or Cancel it.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex-1 min-h-0 relative">
        <div className="h-full overflow-hidden custom-calendar-wrapper">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={calendarEvents}
            eventClick={handleEventClick}
            height="100%"
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            nowIndicator={true}
          />
        </div>
      </div>

      {/* VIP Action Modal */}
      {selectedEvent && (
        <div className="absolute inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 text-lg truncate pr-4">{selectedEvent.title}</h3>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="text-sm text-slate-600">
                <p><strong>Current Status:</strong> {selectedEvent.extendedProps.status}</p>
                <p><strong>Current Time:</strong> {new Date(selectedEvent.startStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} IST - {new Date(selectedEvent.endStr).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, hour: '2-digit', minute: '2-digit' })} IST</p>
              </div>

              {isRescheduling ? (
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">New Start Time</label>
                    <input type="datetime-local" className="w-full text-sm border-slate-300 rounded p-2" 
                      value={rescheduleData.start} onChange={e => setRescheduleData({...rescheduleData, start: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">New End Time</label>
                    <input type="datetime-local" className="w-full text-sm border-slate-300 rounded p-2" 
                      value={rescheduleData.end} onChange={e => setRescheduleData({...rescheduleData, end: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Rescheduling</label>
                    <input type="text" className="w-full text-sm border-slate-300 rounded p-2" placeholder="e.g. Boss is running 15m late"
                      value={rescheduleData.reason} onChange={e => setRescheduleData({...rescheduleData, reason: e.target.value})} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleReschedule} className="flex-1 bg-rust-600 text-white py-2 rounded text-sm font-medium hover:bg-rust-700">Confirm</button>
                    <button onClick={() => setIsRescheduling(false)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded text-sm font-medium hover:bg-slate-300">Back</button>
                  </div>
                </div>
              ) : isDeclining ? (
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Remark for Declining (Sent to requester)</label>
                    <input type="text" className="w-full text-sm border-slate-300 rounded p-2" placeholder="e.g. Please reschedule this to next week."
                      value={declineReason} onChange={e => setDeclineReason(e.target.value)} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleCancelOrDecline} className="flex-1 bg-red-600 text-white py-2 rounded text-sm font-medium hover:bg-red-700">Confirm Decline</button>
                    <button onClick={() => setIsDeclining(false)} className="flex-1 bg-slate-200 text-slate-700 py-2 rounded text-sm font-medium hover:bg-slate-300">Back</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pt-4">
                  {/* VIP ACCEPT BUTTON */}
                  {selectedEvent.extendedProps.status.includes("Pending") && selectedEvent.extendedProps.is_vip && (
                    <button onClick={handleAccept} className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                      Accept Request (Push to Graph)
                    </button>
                  )}
                  
                  <div className="flex gap-3">
                    {/* RESCHEDULE BUTTON: Available to both Organizer and VIP */}
                    <button onClick={() => setIsRescheduling(true)} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                      Reschedule
                    </button>
                    
                    {/* CANCEL/DECLINE BUTTON */}
                    {selectedEvent.extendedProps.status.includes("Pending") && selectedEvent.extendedProps.is_vip && (
                      <button onClick={() => setIsDeclining(true)} className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-200">
                        Decline w/ Remark
                      </button>
                    )}
                    
                    {!selectedEvent.extendedProps.status.includes("Pending") && selectedEvent.extendedProps.is_organizer && (
                      <button onClick={handleCancelOrDecline} className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors border border-red-200">
                        Cancel Meeting
                      </button>
                    )}
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
