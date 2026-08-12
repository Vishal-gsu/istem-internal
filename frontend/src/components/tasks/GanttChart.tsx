"use client";

import { useMemo } from "react";
import { type Task } from "@/data/tasks";
import { CheckCircle2, Circle } from "lucide-react";

interface GanttChartProps {
  tasks: any[];
}

export function GanttChart({ tasks }: GanttChartProps) {
  // Sort tasks by start date
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (!a.start_date || !b.start_date) return 0;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });
  }, [tasks]);

  // Determine timeline span
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) return { minDate: new Date(), maxDate: new Date(), totalDays: 14 };

    let min = new Date("2100-01-01");
    let max = new Date("1900-01-01");

    tasks.forEach(t => {
      if (t.start_date) {
        const d = new Date(t.start_date);
        if (d < min) min = d;
      }
      if (t.due_date) {
        const d = new Date(t.due_date);
        if (d > max) max = d;
      }
    });

    if (min > max) {
      min = new Date();
      max = new Date();
      max.setDate(max.getDate() + 14);
    }

    // Add padding (3 days before, 3 days after)
    min.setDate(min.getDate() - 3);
    max.setDate(max.getDate() + 3);

    const diffTime = Math.abs(max.getTime() - min.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { minDate: min, maxDate: max, totalDays: diffDays };
  }, [tasks]);

  const days = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(minDate);
    d.setDate(d.getDate() + i);
    return d;
  });

  if (tasks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl neu-flat text-muted-foreground">
        No tasks with dates to display on Gantt chart.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto neu-flat rounded-3xl p-6">
      <div className="min-w-[800px]">
        {/* Timeline Header */}
        <div 
          className="grid gap-0 border-b border-muted-foreground/20 pb-2 mb-4" 
          style={{ gridTemplateColumns: `200px repeat(${totalDays}, minmax(40px, 1fr))` }}
        >
          <div className="font-bold text-sm text-muted-foreground px-2">Task</div>
          {days.map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold text-muted-foreground">
              {d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </div>
          ))}
        </div>

        {/* Task Rows */}
        <div className="space-y-4">
          {sortedTasks.map(task => {
            let startIdx = 0;
            let span = 0;
            
            if (task.start_date && task.due_date) {
              const start = new Date(task.start_date);
              const due = new Date(task.due_date);
              
              startIdx = Math.max(0, Math.ceil((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
              span = Math.max(1, Math.ceil((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
            }

            return (
              <div 
                key={task.id} 
                className="grid gap-0 items-center hover:bg-muted/30 transition-colors rounded-xl py-1"
                style={{ gridTemplateColumns: `200px repeat(${totalDays}, minmax(40px, 1fr))` }}
              >
                <div className="px-2 pr-4">
                  <div className="flex items-center gap-2 truncate text-sm font-medium">
                    {task.status === "done" ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="truncate" title={task.title}>{task.title}</span>
                  </div>
                </div>
                
                {/* Gantt Bar */}
                {task.start_date && task.due_date ? (
                  <div 
                    className="relative h-6 rounded-full mx-1 shadow-sm transition-all duration-300"
                    style={{ 
                      gridColumn: `${startIdx + 2} / span ${span}`,
                      background: task.status === "done" ? "var(--success)" : "var(--gradient-rust)",
                      opacity: task.status === "done" ? 0.6 : 1
                    }}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white px-2 truncate">
                      {task.title}
                    </span>
                  </div>
                ) : (
                  <div className="col-span-full ml-4 text-xs italic text-muted-foreground">
                    Unscheduled
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
