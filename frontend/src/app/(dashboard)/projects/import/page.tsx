"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Reveal } from "@/components/dashboard/Reveal";
import { Sparkles, Copy, Calendar, Users, UploadCloud, CheckCircle2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProjectImportPage() {
  const { user: account } = useAuth();
  const router = useRouter();
  
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [people, setPeople] = useState<any[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/org-members`, { credentials: "include" })
      .then(r => {
        if (!r.ok) throw new Error("Failed to fetch teams");
        return r.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          const mapped = data.map((u: any) => ({
            id: u.id || u.mail,
            name: u.displayName || u.mail,
            email: u.mail || ""
          }));
          setPeople(mapped);
          setSelectedEmails(mapped.map(m => m.email)); // Select all by default
        }
      })
      .catch(console.error);
  }, []);

  const systemPrompt = `You are an expert Project Management AI. You will be provided with raw notes or a monthly plan.
Your job is to convert this into a strict JSON structure representing a Project and its Tasks.

Project Constraints:
- Absolute Start Date: ${startDate || "Not Specified"}
- Absolute End Date: ${endDate || "Not Specified"}
- Available Assignee Emails (You MUST ONLY use these exact emails for assignees):
${selectedEmails.join("\n")}

Features you must utilize:
1. Deadlines: Every task must have a \`target_date\` and a \`hard_deadline\`.
2. Status: Use only [tentative, todo, in-progress, blocked, waiting-client, done].
3. Dependencies: Identify bottleneck tasks and map their IDs into the \`depends_on\` array of subsequent tasks.
4. Co-assignees: If multiple people are working on the same task, put all their emails in the \`assignees\` array.
5. Workload: Provide an integer \`estimated_hours\` based on the complexity described.

User's Raw Notes/Plan:
"""
${notes}
"""

Output exactly this JSON format. Do not include markdown code blocks, just raw JSON:
{
  "project_title": "string",
  "start_date": "YYYY-MM-DD",
  "tasks": [
    {
      "id": "temp-1",
      "title": "string",
      "description": "string",
      "status": "todo",
      "target_date": "YYYY-MM-DD",
      "hard_deadline": "YYYY-MM-DD",
      "estimated_hours": 0,
      "priority": "high|medium|low",
      "depends_on": ["temp-X"],
      "assignees": ["email1", "email2"]
    }
  ]
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(systemPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitJson = async () => {
    if (!jsonInput) return;
    setIsSubmitting(true);
    try {
      const parsed = JSON.parse(jsonInput);
      
      // Step 1: Create the Project (MeetingEvent with is_project = true)
      const projRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: parsed.project_title, description: "Imported via AI" })
      });
      const projData = await projRes.json();
      const projectId = projData.project_id;

      // Map temp IDs to real IDs later if needed, but for now we'll just bulk create them without complex DB-level dependency ID resolving (or we can just store the temp IDs in a mapped dictionary).
      // For simplicity in MVP, we just create the tasks sequentially.
      for (const t of parsed.tasks) {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/project-tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: t.title,
            description: t.description,
            status: t.status,
            start_date: t.start_date || parsed.start_date,
            target_date: t.target_date,
            hard_deadline: t.hard_deadline,
            estimated_hours: t.estimated_hours || 0,
            priority: t.priority || "medium",
            depends_on: [], // Skipping complex ID mapping for MVP
            weight: 1,
            project_id: projectId,
            assignees: t.assignees || []
          })
        });
      }

      router.push(`/projects/${projectId}`);
    } catch (e) {
      alert("Invalid JSON or network error: " + e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen pb-40">
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-10 sm:px-6 lg:px-10">
        <Reveal>
          <div className="mb-6">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" /> AI Project Import (Copilot)
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Configure your project parameters below, copy the prompt into Microsoft Copilot, and paste the generated JSON back here.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* LEFT: Config & Prompt Generation */}
          <Reveal delay={100} className="space-y-6">
            <div className="neu-flat rounded-3xl p-6 space-y-5">
              <h2 className="text-xl font-bold">1. Project Parameters</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2 mb-2"><Calendar className="h-4 w-4"/> Start Date</span>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="neu-inset w-full rounded-xl px-4 py-3 text-sm font-medium outline-none" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2 mb-2"><Calendar className="h-4 w-4"/> End Date</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="neu-inset w-full rounded-xl px-4 py-3 text-sm font-medium outline-none" />
                </label>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2 mb-2"><Users className="h-4 w-4"/> Available Team (Uncheck to exclude)</span>
                <div className="neu-inset rounded-xl p-4 max-h-40 overflow-y-auto space-y-2">
                  {people.map(p => (
                    <label key={p.email} className="flex items-center gap-3 text-sm font-medium cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedEmails.includes(p.email)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedEmails(prev => [...prev, p.email]);
                          else setSelectedEmails(prev => prev.filter(email => email !== p.email));
                        }}
                        className="accent-primary w-4 h-4"
                      />
                      {p.name} ({p.email})
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">Raw Notes / Monthly Plan</span>
                <textarea 
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Paste your rough project notes here..."
                  className="neu-inset w-full rounded-xl px-4 py-3 text-sm font-medium outline-none h-32 resize-none"
                />
              </div>
            </div>

            <div className="neu-flat rounded-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">2. Generated AI Prompt</h2>
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 neu-press rounded-full px-4 py-2 text-sm font-bold text-primary transition"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied!" : "Copy Prompt"}
                </button>
              </div>
              <div className="neu-inset rounded-xl p-4 bg-muted/30 max-h-64 overflow-y-auto font-mono text-xs whitespace-pre-wrap text-muted-foreground">
                {systemPrompt}
              </div>
            </div>
          </Reveal>

          {/* RIGHT: JSON Import */}
          <Reveal delay={200} className="space-y-6">
            <div className="neu-flat rounded-3xl p-6 h-full flex flex-col">
              <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
                <UploadCloud className="h-6 w-6 text-primary" /> 3. Import JSON Result
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                After Microsoft Copilot generates the JSON block, paste the raw code here.
              </p>
              
              <textarea 
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder={'{\n  "project_title": "..."\n}'}
                className="neu-inset w-full flex-1 rounded-xl px-4 py-4 font-mono text-sm outline-none resize-none mb-6 min-h-[300px]"
              />

              <button 
                onClick={handleSubmitJson}
                disabled={isSubmitting || !jsonInput}
                className="neu-raised flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSubmitting ? "Importing..." : "Process and Create Project"} <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
