"use client";

import React, { useState, useRef, useEffect } from "react";
import { User } from "@/data/tasks";
import { Search, ChevronDown, Check } from "lucide-react";

interface UserComboboxProps {
  users: User[];
  value: string | null;
  onChange: (userId: string) => void;
  placeholder?: string;
  className?: string;
}

export function UserCombobox({ users, value, onChange, placeholder = "Select user...", className = "" }: UserComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedUser = users.find(u => u.id === value);
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between neu-inset rounded-2xl px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <span className={selectedUser ? "text-foreground font-semibold" : "text-muted-foreground"}>
          {selectedUser ? selectedUser.name : placeholder}
        </span>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl neu-raised bg-background p-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl bg-secondary/50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
            {filteredUsers.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground text-center italic">No users found.</p>
            ) : (
              filteredUsers.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => {
                    onChange(user.id);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                    value === user.id ? "bg-primary/10 font-bold text-primary" : "hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                      {user.initials}
                    </span>
                    <span>{user.name}</span>
                  </div>
                  {value === user.id && <Check size={14} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
