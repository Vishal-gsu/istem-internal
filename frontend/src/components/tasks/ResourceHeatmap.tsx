"use client";

import { useMemo } from "react";
import { type Task } from "@/data/tasks";

interface ResourceHeatmapProps {
  tasks: Task[];
}

export function ResourceHeatmap({ tasks }: ResourceHeatmapProps) {
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) return { minDate: new Date(), maxDate: new Date(), totalDays: 14 };

    let min = new Date("2100-01-01");
    let max = new Date("1900-01-01");

    tasks.forEach(t => {
      if (t.start) {
        const d = new Date(t.start);
        if (d < min) min = d;
      }
      if (t.hardDeadline || t.due) {
        const d = new Date(t.hardDeadline || t.due!);
        if (d > max) max = d;
      }
    });

    if (min > max) {
      min = new Date();
      max = new Date();
      max.setDate(max.getDate() + 14);
    }

    min.setDate(min.getDate() - 2);
    max.setDate(max.getDate() + 2);

    const diffTime = Math.abs(max.getTime() - min.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { minDate: min, maxDate: max, totalDays: diffDays };
  }, [tasks]);

  const days = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  const assigneeWorkload = useMemo(() => {
    const workload: Record<string, Record<string, number>> = {};
    
    tasks.forEach(t => {
      if (!t.assigneeIds || t.assigneeIds.length === 0) return;
      if (!t.start || !(t.hardDeadline || t.due)) return;
      
      const start = new Date(t.start);
      const due = new Date(t.hardDeadline || t.due!);
      const span = Math.max(1, Math.ceil((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const hrsPerDay = (t.estimatedHours || 0) / span;

      t.assigneeIds.forEach(email => {
        if (!workload[email]) workload[email] = {};
        
        for (let i = 0; i < span; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          const dStr = d.toDateString();
          workload[email][dStr] = (workload[email][dStr] || 0) + hrsPerDay;
        }
      });
    });
    
    return workload;
  }, [tasks]);

  const emails = Object.keys(assigneeWorkload);

  if (emails.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-3xl neu-flat text-muted-foreground">
        No assigned tasks to display workload.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto neu-flat rounded-3xl p-6 mt-6">
      <div className="min-w-[800px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Resource Heatmap</h3>
          <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-success/20 border border-success"></div> &le; 8 hrs/day</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-destructive/20 border border-destructive"></div> &gt; 8 hrs/day</span>
          </div>
        </div>

        <div 
          className="grid gap-0 border-b border-muted-foreground/20 pb-2 mb-4" 
          style={{ gridTemplateColumns: `200px repeat(${totalDays}, minmax(40px, 1fr))` }}
        >
          <div className="font-bold text-sm text-muted-foreground px-2">Assignee</div>
          {days.map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold text-muted-foreground">
              {d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {emails.map(email => (
            <div 
              key={email} 
              className="grid gap-0 items-center hover:bg-muted/30 transition-colors rounded-xl py-1"
              style={{ gridTemplateColumns: `200px repeat(${totalDays}, minmax(40px, 1fr))` }}
            >
              <div className="px-2 pr-4 truncate text-sm font-medium" title={email}>
                {email}
              </div>
              
              {days.map((d, i) => {
                const hrs = assigneeWorkload[email][d.toDateString()] || 0;
                const isOver = hrs > 8;
                if (hrs === 0) return <div key={i} />;
                
                return (
                  <div key={i} className="p-1 h-full">
                    <div 
                      className={`h-8 w-full rounded-md flex items-center justify-center text-xs font-bold transition-all shadow-sm ${isOver ? 'bg-destructive/20 border border-destructive text-destructive' : 'bg-success/20 border border-success text-success'}`}
                      title={`${hrs.toFixed(1)} hrs`}
                    >
                      {hrs.toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
