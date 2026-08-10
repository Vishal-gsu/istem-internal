"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../components/AuthProvider";

interface OrgMember {
  id: string;
  displayName: string;
  mail: string;
}

interface Attendee {
  member: OrgMember;
  isVip: boolean;
  prepTask: string;
}

export default function ScheduleMeetingPage() {
  const { user: account } = useAuth();
  
  // Form State
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [duration, setDuration] = useState("PT1H");
  const [protectLunch, setProtectLunch] = useState(true);
  
  // Time Preferences State
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timeMode, setTimeMode] = useState("nearest");

  // Attendees State
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  
  // Multi-select for Add Attendee
  const [selectedEmailsForAdd, setSelectedEmailsForAdd] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Task Assignment State
  const [assignSameTask, setAssignSameTask] = useState(true);
  const [globalTask, setGlobalTask] = useState("");

  // Result State
  const [freeSlots, setFreeSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bookingSuccess, setBookingSuccess] = useState<any>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        if (!account) return;
        const apiResponse = await fetch("/api/org-members", { credentials: "include" });
        if (apiResponse.ok) {
          const data = await apiResponse.json();
          setOrgMembers(data);
        }
      } catch (err) {
        console.error("Failed to load org members", err);
      }
    };
    fetchMembers();
  }, [account]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleEmailSelection = (email: string) => {
    setSelectedEmailsForAdd(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleAddAttendees = () => {
    const newAttendees = selectedEmailsForAdd.map(email => {
      const member = orgMembers.find(m => (m.mail || m.id) === email);
      return member ? { member, isVip: false, prepTask: assignSameTask ? globalTask : "" } : null;
    }).filter(Boolean) as Attendee[];

    const toAdd = newAttendees.filter(na => !attendees.some(a => a.member.id === na.member.id));
    setAttendees([...attendees, ...toAdd]);
    setSelectedEmailsForAdd([]);
    setIsDropdownOpen(false);
  };

  const updateAttendee = (id: string, updates: Partial<Attendee>) => {
    setAttendees(attendees.map(a => a.member.id === id ? { ...a, ...updates } : a));
  };

  const removeAttendee = (id: string) => {
    setAttendees(attendees.filter(a => a.member.id !== id));
  };

  // Sync global task to all attendees when checkbox is checked
  useEffect(() => {
    if (assignSameTask) {
      setAttendees(prev => prev.map(a => ({ ...a, prepTask: globalTask })));
    }
  }, [assignSameTask, globalTask]);

  const handleFindSlots = async () => {
    if (!date) {
      setError("Please select a date first.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setBookingSuccess(null);
    try {
      const payload = {
        attendees: attendees.map(a => ({
          email: a.member.mail || a.member.id,
          is_vip: a.isVip,
          prep_task: a.prepTask
        })),
        duration: duration,
        protect_lunch: protectLunch,
        date: date,
        time: time,
        mode: timeMode
      };

      const apiResponse = await fetch("/api/find-meeting-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!apiResponse.ok) throw new Error(await apiResponse.text());
      const data = await apiResponse.json();
      setFreeSlots(data.meetingTimeSuggestions || []);
    } catch (err: any) {
      setError(err.message || "Failed to find meeting times");
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async (slot: any) => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        title: title || "New Meeting",
        start_time: slot.meetingTimeSlot.start.dateTime + "Z", // Passed as UTC
        end_time: slot.meetingTimeSlot.end.dateTime + "Z",
        attendees: attendees.map(a => ({
          email: a.member.mail || a.member.id,
          is_vip: a.isVip,
          prep_task: a.prepTask
        }))
      };

      const apiResponse = await fetch("/api/schedule-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (!apiResponse.ok) throw new Error(await apiResponse.text());
      const data = await apiResponse.json();
      setBookingSuccess(data);
      setFreeSlots([]);
    } catch (err: any) {
      setError(err.message || "Failed to book meeting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Schedule a Meeting</h1>
        <p className="text-slate-500 mt-2">Find available slots and manage VIP workflows.</p>
      </div>

      {bookingSuccess ? (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            <h2 className="text-xl font-bold">Booking Request Submitted!</h2>
          </div>
          <p className="mt-2 text-green-700">Status: <strong className="font-semibold">{bookingSuccess.state || "Pending/Booked"}</strong></p>
          {bookingSuccess.state === "Pending VIP Approval" && (
            <p className="mt-1 text-sm bg-yellow-100 text-yellow-800 p-2 rounded mt-2 border border-yellow-200">
              Because a VIP is invited, this meeting is waiting for their explicit approval on the dashboard before calendar invites are sent.
            </p>
          )}
          {bookingSuccess.teams_link && (
            <p className="mt-3">
              <a href={bookingSuccess.teams_link} target="_blank" rel="noreferrer" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 inline-block text-sm font-medium">Join Teams Meeting</a>
            </p>
          )}
          <button onClick={() => setBookingSuccess(null)} className="mt-4 text-green-700 hover:underline text-sm font-medium">Schedule another meeting</button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Meeting Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                  <input type="text" className="w-full border-slate-300 rounded-md shadow-sm focus:border-rust-500 focus:ring-rust-500 sm:text-sm p-2 border" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Quarterly Planning"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                  <select className="w-full border-slate-300 rounded-md shadow-sm focus:border-rust-500 focus:ring-rust-500 sm:text-sm p-2 border" value={duration} onChange={(e) => setDuration(e.target.value)}>
                    <option value="PT30M">30 Minutes</option>
                    <option value="PT1H">1 Hour</option>
                    <option value="PT2H">2 Hours</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Agenda</label>
                <textarea className="w-full border-slate-300 rounded-md shadow-sm focus:border-rust-500 focus:ring-rust-500 sm:text-sm p-2 border h-32" value={agenda} onChange={(e) => setAgenda(e.target.value)} placeholder="Brief agenda..."></textarea>
              </div>
            </div>
          </div>
          
          {/* New Time Preferences Section */}
          <div className="p-6 border-b border-slate-200 bg-white">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Time & Preferences (IST)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Date <span className="text-red-500">*</span></label>
                <input type="date" className="w-full border-slate-300 rounded-md shadow-sm focus:border-rust-500 focus:ring-rust-500 sm:text-sm p-2 border" value={date} onChange={(e) => setDate(e.target.value)} required/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Time</label>
                <input type="time" className="w-full border-slate-300 rounded-md shadow-sm focus:border-rust-500 focus:ring-rust-500 sm:text-sm p-2 border" value={time} onChange={(e) => setTime(e.target.value)}/>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Search Mode</label>
                <select className="w-full border-slate-300 rounded-md shadow-sm focus:border-rust-500 focus:ring-rust-500 sm:text-sm p-2 border" value={timeMode} onChange={(e) => setTimeMode(e.target.value)}>
                  <option value="nearest">Nearest to Preferred Time</option>
                  <option value="after">Strictly After</option>
                  <option value="before">Strictly Before</option>
                  <option value="exact">Force Exact Time (Admin)</option>
                  <option value="any">Any Available Slot</option>
                </select>
              </div>
            </div>
            <div className="flex items-center mt-4">
              <input 
                type="checkbox" 
                id="lunch" 
                className="h-4 w-4 text-rust-600 focus:ring-rust-500 border-slate-300 rounded"
                checked={protectLunch}
                onChange={(e) => setProtectLunch(e.target.checked)}
              />
              <label htmlFor="lunch" className="ml-2 block text-sm text-slate-700 font-medium">Protect Lunch Time (12 PM - 1 PM)</label>
            </div>
          </div>

          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Attendees & Assignments</h2>
            
            <div className="flex gap-4 mb-6 relative" ref={dropdownRef}>
              <div className="flex-1 relative">
                <button 
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full text-left border-slate-300 rounded-md shadow-sm focus:border-rust-500 focus:ring-rust-500 sm:text-sm p-2 border bg-white flex justify-between items-center"
                >
                  <span className={selectedEmailsForAdd.length === 0 ? "text-slate-500" : "text-slate-900"}>
                    {selectedEmailsForAdd.length > 0 ? `${selectedEmailsForAdd.length} members selected` : "Select multiple members..."}
                  </span>
                  <svg className="w-5 h-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-slate-200">
                    {orgMembers.map(m => {
                      const email = m.mail || m.id;
                      const isSelected = selectedEmailsForAdd.includes(email);
                      return (
                        <div 
                          key={m.id} 
                          className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-rust-50 text-slate-900 flex items-center"
                          onClick={() => toggleEmailSelection(email)}
                        >
                          <input type="checkbox" className="mr-3 h-4 w-4 text-rust-600 border-slate-300 rounded focus:ring-rust-500" checked={isSelected} readOnly />
                          <span className="block truncate">{m.displayName} <span className="text-slate-400 text-xs ml-1">({email})</span></span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <button 
                onClick={handleAddAttendees}
                disabled={selectedEmailsForAdd.length === 0}
                className="bg-rust-600 text-white px-6 py-2 rounded-md font-medium hover:bg-rust-700 disabled:opacity-50 transition-colors"
              >
                Add Attendees
              </button>
            </div>

            {/* Bulk Task Assignment Section */}
            {attendees.length > 0 && (
              <div className="mb-6 p-4 border border-rust-200 bg-rust-50 rounded-lg">
                <div className="flex items-center mb-3">
                  <input 
                    type="checkbox" 
                    id="assignSame" 
                    className="h-4 w-4 text-rust-600 focus:ring-rust-500 border-slate-300 rounded"
                    checked={assignSameTask}
                    onChange={(e) => setAssignSameTask(e.target.checked)}
                  />
                  <label htmlFor="assignSame" className="ml-2 block text-sm font-bold text-rust-800">
                    Assign the same task to everyone
                  </label>
                </div>
                
                {assignSameTask && (
                  <div>
                    <input 
                      type="text" 
                      className="w-full border-slate-300 rounded-md shadow-sm focus:border-rust-500 focus:ring-rust-500 sm:text-sm p-2 border bg-white"
                      value={globalTask}
                      onChange={(e) => setGlobalTask(e.target.value)}
                      placeholder="e.g. Please review the attached quarterly report."
                    />
                    <p className="text-xs text-rust-600 mt-2">This task will automatically apply to all current and future attendees.</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              {attendees.map((attendee) => (
                <div key={attendee.member.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 flex items-center gap-2 mb-1">
                      {attendee.member.displayName}
                      <button 
                        onClick={() => updateAttendee(attendee.member.id, { isVip: !attendee.isVip })}
                        title={attendee.isVip ? "Remove VIP Status" : "Mark as VIP"}
                        className={`text-xl ${attendee.isVip ? 'text-yellow-400' : 'text-slate-300 hover:text-yellow-200'}`}
                      >
                        ★
                      </button>
                    </div>
                    <div className="text-xs text-slate-500">{attendee.member.mail}</div>
                  </div>
                  
                  {!assignSameTask && (
                    <div className="flex-[2]">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Individual Task</label>
                      <input 
                        type="text" 
                        className="w-full border-slate-300 rounded-md shadow-sm focus:border-rust-500 focus:ring-rust-500 sm:text-sm p-1.5 border"
                        value={attendee.prepTask}
                        onChange={(e) => updateAttendee(attendee.member.id, { prepTask: e.target.value })}
                        placeholder="Assign a specific task..."
                      />
                    </div>
                  )}

                  <button onClick={() => removeAttendee(attendee.member.id)} className="text-red-500 hover:text-red-700 text-sm font-medium p-2">Remove</button>
                </div>
              ))}
              {attendees.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No attendees added yet.</p>}
            </div>
          </div>

          <div className="p-6 flex justify-end">
            <button 
              onClick={handleFindSlots}
              disabled={loading || attendees.length === 0 || !date}
              className="bg-rust-700 text-white px-6 py-2.5 rounded-md font-medium hover:bg-rust-800 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> : null}
              {loading ? "Calculating Slots..." : "Find Meeting Times"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {freeSlots.length > 0 && !bookingSuccess && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Available Slots (IST)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {freeSlots.map((slot: any, index: number) => {
              const start = new Date(slot.meetingTimeSlot.start.dateTime + "Z");
              const end = new Date(slot.meetingTimeSlot.end.dateTime + "Z");
              return (
                <div key={index} className={`bg-white p-4 rounded-lg border shadow-sm flex flex-col justify-between h-full ${slot.softConflict ? 'border-amber-400 bg-amber-50' : 'border-rust-200'}`}>
                  <div>
                    <div className="text-lg font-bold text-slate-800">
                      {start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-sm text-slate-600 mt-1 font-medium">
                      {start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} - {end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })} IST
                    </div>
                    {slot.softConflict && (
                      <div className="mt-2 text-xs font-semibold text-amber-700 flex items-start gap-1">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Soft Conflict: {slot.conflictReason}
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => handleBookSlot(slot)}
                    disabled={loading}
                    className="mt-4 w-full bg-slate-900 text-white py-2 rounded-md text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Booking..." : "Select & Book"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
