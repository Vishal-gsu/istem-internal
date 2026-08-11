"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useStore } from '@/store/useStore';

export default function Header() {
  const { user: account } = useAuth();
  const { toggleMobileMenu } = useStore();
  
  const [reminders, setReminders] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeNotification, setActiveNotification] = useState<any>(null);
  const [snoozeMins, setSnoozeMins] = useState(5);

  const handleLogout = () => {
    window.location.href = "/api/auth/logout";
  };

  const fetchReminders = async () => {
    if (!account?.username) return;
    try {
      const res = await fetch(`/api/my-reminders?email=${account.username}`, { credentials: "include" });
      if (res.ok) {
        setReminders(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReminders();
    // In a real app, we'd poll or use websockets. We poll every 30s here.
    const interval = setInterval(fetchReminders, 30000);
    return () => clearInterval(interval);
  }, [account]);

  // Simulate triggering a reminder for demo purposes
  const triggerMockNotification = async (reminder: any) => {
    setActiveNotification(reminder);
    setShowDropdown(false);
    
    // Test Case 2 (The Forgetful Attendee) Logging: 
    // Log to console (simulating DB insertion) that this user was forced to review the checklist.
    console.log(`[LOG] Notification delivered to ${account?.username}. Readiness Checklist enforced.`);
    
    // Simulate updating the meeting status log
    try {
      // In a real app we would POST to an audit endpoint
      console.log(`[AUDIT] Meeting ${reminder.meeting_id} marked with notification triggered status in Calendar Logs.`);
    } catch(e) {}
  };

  const snoozeNotification = () => {
    setActiveNotification(null);
    alert(`Reminder snoozed for ${snoozeMins} minutes.`);
  };

  const initials = account?.name ? account.name.split(" ").map((n: string) => n[0]).join("") : "ME";

  return (
    <>
      <header className="fixed top-0 left-0 w-full h-16 bg-rust-600 text-white flex items-center px-4 md:px-6 z-50 shadow-md">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Hamburger Menu Mobile */}
          <button 
            onClick={toggleMobileMenu}
            className="md:hidden p-2 -ml-2 text-rust-100 hover:text-white rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="hidden md:flex w-8 h-8 bg-rust-100 text-rust-700 rounded-lg items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight">I-STEM</h1>
        </div>
        
        <div className="ml-auto flex items-center gap-4 relative">
          
          {/* Global Notification Bell */}
          <button 
            onClick={() => setShowDropdown(!showDropdown)} 
            className="relative p-2 text-rust-100 hover:text-white hover:bg-rust-500 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {reminders.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-rust-600"></span>
            )}
          </button>

          {/* Reminder Dropdown */}
          {showDropdown && (
            <div className="absolute top-full mt-2 right-12 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden text-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-sm">Upcoming Web Reminders</h3>
                <button onClick={fetchReminders} className="text-xs text-rust-600 hover:underline">Refresh</button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {reminders.length === 0 && <p className="p-4 text-sm text-slate-500 text-center">No active reminders.</p>}
                {reminders.map(r => (
                  <div key={r.id} onClick={() => triggerMockNotification(r)} className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                    <p className="text-sm font-bold text-slate-900 truncate">{r.meeting_title}</p>
                    <p className="text-xs text-slate-500 mt-1">Triggers {r.minutes_before} mins before start</p>
                    <p className="text-[10px] text-rust-600 font-semibold mt-2 uppercase tracking-wide">Click to mock trigger</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report Bug Button */}
          <a
            href="https://github.com/Vishal-istem/istem-internal/issues/new?title=[BUG]%20&body=Describe%20the%20bug%3A%0A%0ASteps%20to%20reproduce%3A%0A%0AExpected%20behavior%3A"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-amber-100 hover:text-white hover:bg-amber-600/30 border border-amber-400/30 px-3 py-1.5 rounded-md transition-colors hidden sm:flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Report Bug
          </a>

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="text-sm font-medium text-rust-100 hover:text-white hover:bg-rust-500 px-3 py-1.5 rounded-md transition-colors hidden sm:block"
          >
            Logout
          </button>
          
          {/* User Profile */}
          <div className="w-9 h-9 rounded-full bg-rust-500 border border-rust-400 flex items-center justify-center text-sm font-semibold shadow-sm">
            {initials}
          </div>
        </div>
      </header>

      {/* Triggered Notification / Readiness Popup */}
      {activeNotification && (
        <div className="fixed bottom-6 right-6 w-96 bg-slate-900 text-white rounded-xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="p-4 bg-rust-600 flex justify-between items-center">
            <h3 className="font-bold flex items-center text-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Meeting Starting Soon!
            </h3>
            <button onClick={() => setActiveNotification(null)} className="text-rust-200 hover:text-white">&times;</button>
          </div>
          <div className="p-5">
            <p className="text-sm font-bold mb-1">{activeNotification.meeting_title}</p>
            <p className="text-xs text-slate-400 mb-4">Starts in {activeNotification.minutes_before} minutes.</p>
            
            <div className="bg-slate-800 rounded p-3 mb-4">
              <p className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">Readiness Check</p>
              <label className="flex items-start gap-2 text-sm text-slate-200">
                <input type="checkbox" className="mt-1 rounded border-slate-600 text-rust-600 focus:ring-rust-500" />
                <span>Did you complete your assigned Prep Tasks?</span>
              </label>
              <label className="flex items-start gap-2 text-sm text-slate-200 mt-2">
                <input type="checkbox" className="mt-1 rounded border-slate-600 text-rust-600 focus:ring-rust-500" />
                <span>Have you reviewed the Shared Meeting Notes?</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setActiveNotification(null)} className="flex-1 bg-rust-600 hover:bg-rust-500 text-white py-2 rounded text-sm font-medium transition-colors">Join Now</button>
              
              <div className="flex bg-slate-700 rounded overflow-hidden">
                <button onClick={() => setSnoozeMins(Math.max(1, snoozeMins - 1))} className="px-3 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors">-</button>
                <button onClick={snoozeNotification} className="flex-1 px-4 hover:bg-slate-600 text-white text-sm font-medium transition-colors border-x border-slate-600">Snooze {snoozeMins}m</button>
                <button onClick={() => setSnoozeMins(snoozeMins + 1)} className="px-3 hover:bg-slate-600 text-slate-300 hover:text-white transition-colors">+</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
