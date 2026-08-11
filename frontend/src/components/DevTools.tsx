"use client";

import { useEffect, useState } from "react";

export default function DevTools() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999] flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur">
      <div className="flex items-center gap-2 border-r border-slate-600 pr-2">
        <span className="sm:hidden text-yellow-400">XS (&lt;640px)</span>
        <span className="hidden sm:inline md:hidden text-green-400">SM (≥640px)</span>
        <span className="hidden md:inline lg:hidden text-blue-400">MD (≥768px)</span>
        <span className="hidden lg:inline xl:hidden text-purple-400">LG (≥1024px)</span>
        <span className="hidden xl:inline 2xl:hidden text-pink-400">XL (≥1280px)</span>
        <span className="hidden 2xl:inline text-rust-400">2XL (≥1536px)</span>
      </div>
      <div className="flex items-center gap-1 font-mono text-[10px] text-slate-300">
        <span>{dimensions.width}</span>
        <span className="text-slate-500">×</span>
        <span>{dimensions.height}</span>
      </div>
    </div>
  );
}
