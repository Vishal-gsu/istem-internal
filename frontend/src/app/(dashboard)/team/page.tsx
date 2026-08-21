"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { X, MessageSquare, Clock, User, Calendar } from "lucide-react";
import { ChatWidget } from "@/components/team/ChatWidget";

interface OrgMember {
  id: string;
  displayName: string;
  mail: string;
  jobTitle: string;
  userPrincipalName?: string;
}

interface BusyBlock {
  start: string;
  end: string;
}

function parseTime(isoString: string) {
  const date = new Date(isoString);
  return date.getHours() + date.getMinutes() / 60;
}

function DailyTimeline({ blocks }: { blocks: BusyBlock[] }) {
  // Render timeline from 9:30 AM to 5:30 PM (8 hours)
  const startHour = 9.5;
  const endHour = 17.5;
  const totalHours = endHour - startHour;

  // Calculate current time indicator
  const now = new Date();
  const currentHours = now.getHours() + now.getMinutes() / 60;
  const showCurrentTime = currentHours >= startHour && currentHours <= endHour;
  const currentLeftPercent = ((currentHours - startHour) / totalHours) * 100;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Clock className="size-3.5 text-rust-500" /> Today's Availability
        </h4>
        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">9:30 AM - 5:30 PM</span>
      </div>
      
      {/* The Cool Strip */}
      <div className="relative h-14 w-full neu-inset rounded-2xl overflow-hidden flex bg-slate-50 border border-slate-200/60 shadow-inner">
        {/* Hour markers background */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 border-r border-slate-200/60 h-full opacity-60" />
        ))}

        {/* Current Time Indicator */}
        {showCurrentTime && (
          <div 
            className="absolute top-0 bottom-0 z-20 w-0.5 bg-rust-500 shadow-[0_0_8px_rgba(234,88,12,0.8)]"
            style={{ left: `${currentLeftPercent}%` }}
          >
            <div className="absolute -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-rust-500 animate-pulse" />
          </div>
        )}

        {/* Busy Blocks Overlay */}
        {blocks.map((block, idx) => {
          const start = Math.max(startHour, parseTime(block.start));
          const end = Math.min(endHour, block.end ? parseTime(block.end) : start + 0.5);
          
          if (start >= endHour || end <= startHour) return null; // Outside working hours
          
          const leftPercent = ((start - startHour) / totalHours) * 100;
          const widthPercent = ((end - start) / totalHours) * 100;

          return (
            <div 
              key={idx}
              className="absolute top-1 bottom-1 z-10 rounded-xl shadow-sm hover:opacity-100 transition-opacity duration-200 cursor-help flex items-center justify-center overflow-hidden"
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`,
                background: "linear-gradient(135deg, #f97316 0%, #c2410c 100%)",
                opacity: 0.9,
              }}
              title={`Busy: ${new Date(block.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${block.end ? new Date(block.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}`}
            >
              {widthPercent > 12 && (
                <span className="text-[9px] font-bold text-white/90 whitespace-nowrap px-1 select-none">
                  {new Date(block.start).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} - {block.end ? new Date(block.end).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}) : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-3 text-[10px] font-extrabold text-slate-400 uppercase px-1">
        <span>9:30 AM</span>
        <span>1:30 PM</span>
        <span>5:30 PM</span>
      </div>

      {/* Explicit Time Readout */}
      <div className="mt-5 border-t border-slate-100/60 pt-4">
        {blocks.length > 0 ? (
          <div className="space-y-2">
            <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Scheduled Meetings</h5>
            <div className="flex flex-wrap gap-2">
              {blocks.map((block, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rust-50/50 text-rust-700 text-xs font-semibold border border-rust-100/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-rust-500" />
                  {new Date(block.start).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})} - {block.end ? new Date(block.end).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}) : ''}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs font-medium text-emerald-600 flex items-center gap-1.5 bg-emerald-50/50 px-3 py-2 rounded-lg border border-emerald-100/50 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> No meetings scheduled today!
          </div>
        )}
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { user: account } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [busyBlocks, setBusyBlocks] = useState<BusyBlock[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        if (!account) return;
        const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/org-members`, { credentials: "include" });
        if (!apiResponse.ok) throw new Error("Failed to fetch members");
        const data = await apiResponse.json();
        setMembers(data);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, [account]);

  useEffect(() => {
    if (selectedMember) {
      const email = selectedMember.mail || selectedMember.userPrincipalName;
      if (!email) return;
      
      setLoadingAvailability(true);
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/members/${email}/availability`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch availability");
          return res.json();
        })
        .then(data => setBusyBlocks(data || []))
        .catch(console.error)
        .finally(() => setLoadingAvailability(false));
    }
  }, [selectedMember]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rust-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Team Hub</h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium">View your organization members and their daily availability.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {members.map((member) => (
          <div 
            key={member.id} 
            onClick={() => setSelectedMember(member)}
            className="relative overflow-hidden neu-raised bg-white rounded-[2rem] p-6 cursor-pointer hover:shadow-2xl hover:shadow-rust-500/5 hover:-translate-y-1 transition-all duration-300 group border border-slate-100/60"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rust-100/40 to-transparent rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-[1.8] duration-500 ease-out opacity-0 group-hover:opacity-100" />
            <div className="relative flex items-center gap-5 z-10">
              <div className="relative shrink-0">
                <div className="h-16 w-16 rounded-[1.25rem] neu-inset flex items-center justify-center bg-slate-50/50 group-hover:bg-white transition-colors duration-300">
                  <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-rust-500 to-rust-700">{member.displayName.charAt(0)}</span>
                </div>
                {/* Simulated status dot */}
                <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500 shadow-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[17px] font-extrabold text-slate-800 tracking-tight truncate group-hover:text-rust-600 transition-colors">{member.displayName}</h3>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide truncate mt-1">{member.jobTitle || 'Team Member'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Profile Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="neu-raised bg-background rounded-3xl w-full max-w-lg overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-6 pb-0 flex justify-between items-start">
              <div className="flex gap-5 items-center">
                <div className="h-20 w-20 rounded-[28px] neu-inset flex items-center justify-center bg-background shrink-0">
                  <span className="text-3xl font-black text-rust-600">{selectedMember.displayName.charAt(0)}</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-foreground">{selectedMember.displayName}</h2>
                  <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground mt-1">{selectedMember.jobTitle || 'Team Member'}</p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedMember(null); setChatOpen(false); }}
                className="h-8 w-8 rounded-full neu-inset flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm font-medium text-slate-600 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                  <User className="size-4 shrink-0 text-rust-500" />
                  <span className="truncate">{selectedMember.mail || selectedMember.userPrincipalName || 'No email provided'}</span>
                </div>
              </div>

              {loadingAvailability ? (
                <div className="h-24 mt-6 neu-inset rounded-xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-rust-500"></div>
                </div>
              ) : (
                <DailyTimeline blocks={busyBlocks} />
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-6 pt-4 mt-auto border-t border-slate-100/50 bg-slate-50/30 flex gap-4">
              <button 
                onClick={() => setChatOpen(true)}
                className="flex-1 neu-press inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-white transition-transform hover:scale-105"
                style={{ background: "#5b5fc7", boxShadow: "0 8px 20px -6px rgba(91, 95, 199, 0.5)" }}
              >
                <MessageSquare className="size-4" /> Chat on Teams
              </button>
              <button 
                onClick={() => router.push("/schedule")}
                className="flex-1 neu-press inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-muted-foreground hover:text-foreground bg-white"
              >
                <Calendar className="size-4" /> Schedule Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedMember && chatOpen && (
        <ChatWidget 
          email={selectedMember.mail || selectedMember.userPrincipalName || ''}
          name={selectedMember.displayName}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
