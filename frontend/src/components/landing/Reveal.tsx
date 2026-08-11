"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "./use-scroll-reveal";

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cn("reveal", visible && "reveal-in", className)}
    >
      {children}
    </div>
  );
}
