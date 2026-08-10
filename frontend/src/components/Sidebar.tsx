"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();
  
  return (
    <aside className="fixed top-16 left-0 w-16 hover:w-64 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 py-4 transition-all duration-300 overflow-x-hidden z-40 group flex flex-col shadow-[4px_0_15px_rgba(0,0,0,0.05)]">
      {/* Hamburger Menu top icon */}
      <div className="flex items-center px-4 mb-6 text-slate-400 group-hover:text-rust-600 transition-colors">
        <svg className="w-8 h-8 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2 px-3">
          {/* Dashboard */}
          <li>
            <Link href="/" className={`flex items-center p-2 rounded-lg font-medium transition-colors ${pathname === '/' ? 'bg-rust-50 text-rust-700' : 'text-slate-600 hover:bg-slate-50 hover:text-rust-600'}`}>
              <svg className="w-6 h-6 shrink-0 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap ml-4 transition-opacity duration-300">Dashboard</span>
            </Link>
          </li>
          {/* Organization Members */}
          <li>
            <Link href="/members" className={`flex items-center p-2 rounded-lg font-medium transition-colors ${pathname === '/members' ? 'bg-rust-50 text-rust-700' : 'text-slate-600 hover:bg-slate-50 hover:text-rust-600'}`}>
              <svg className="w-6 h-6 shrink-0 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap ml-4 transition-opacity duration-300">Org Members</span>
            </Link>
          </li>
          {/* Meetings Hub - New Unique Icon */}
          <li>
            <Link href="/meetings" className={`flex items-center p-2 rounded-lg font-medium transition-colors ${pathname.startsWith('/meetings') ? 'bg-rust-50 text-rust-700' : 'text-slate-600 hover:bg-slate-50 hover:text-rust-600'}`}>
              <svg className="w-6 h-6 shrink-0 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap ml-4 transition-opacity duration-300">Meetings Hub</span>
            </Link>
          </li>
          {/* Calendar */}
          <li>
            <Link href="/calendar" className={`flex items-center p-2 rounded-lg font-medium transition-colors ${pathname === '/calendar' ? 'bg-rust-50 text-rust-700' : 'text-slate-600 hover:bg-slate-50 hover:text-rust-600'}`}>
              <svg className="w-6 h-6 shrink-0 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap ml-4 transition-opacity duration-300">My Calendar</span>
            </Link>
          </li>
          {/* Admin */}
          <li>
            <Link href="/admin" className={`flex items-center p-2 rounded-lg font-medium transition-colors ${pathname === '/admin' ? 'bg-rust-50 text-rust-700' : 'text-slate-600 hover:bg-slate-50 hover:text-rust-600'}`}>
              <svg className="w-6 h-6 shrink-0 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="opacity-0 group-hover:opacity-100 whitespace-nowrap ml-4 transition-opacity duration-300">Admin Settings</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
