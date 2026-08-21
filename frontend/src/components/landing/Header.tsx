"use client";
import { useEffect, useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const loggedOutLinks = [
  { label: "Features", href: "/#features" },
  { label: "Meetings", href: "/#workflow" },
  { label: "Tasks", href: "/#features" },
  { label: "Approvals", href: "/#workflow" },
];

const loggedInLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Projects", href: "/projects" },
  { label: "Calendar", href: "/calendar" },
  { label: "Meetings", href: "/meetings" },
  { label: "Schedule", href: "/schedule" },
  { label: "Tasks", href: "/tasks" },
  { label: "Issues", href: "/issues" },
  { label: "Teams", href: "/team" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/me`, { credentials: "include" })
      .then(res => {
        if (res.ok) setIsLoggedIn(true);
      })
      .catch(() => {});
  }, []);

  const handleLogin = () => {
    if (isLoggedIn) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/auth/login`;
    }
  };

  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  useEffect(() => {
    if (isLoggedIn) {
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/projects/invites/pending`, { credentials: "include" })
        .then(res => {
          if (res.ok) return res.json();
          return [];
        })
        .then(data => setPendingInvites(data))
        .catch(() => {});
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 w-full transition-all duration-300",
        scrolled ? "py-2" : "py-4",
      )}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div
          className={cn(
            "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl px-4 py-3 transition-all duration-300 md:flex md:justify-between",
            scrolled ? "neu-glass" : "bg-transparent",
          )}
        >
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || '/sync'}/logo.png`} alt="I-STEM Logo" className="h-10 w-auto object-contain" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {(isLoggedIn ? loggedInLinks : loggedOutLinks).map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl neu-raised text-muted-foreground hover:text-foreground transition-all"
                >
                  <Sparkles size={18} />
                  {pendingInvites.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {pendingInvites.length}
                    </span>
                  )}
                </Link>
                <a
                  href={`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/auth/logout`}
                  className="rounded-xl neu-inset px-4 py-2 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:text-foreground"
                >
                  Logout
                </a>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-foreground transition-all duration-200 hover:bg-secondary"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={handleLogin}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-[1.03] hover:shadow-xl hover:shadow-primary/30"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl neu-raised text-foreground md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {open && (
          <div className="mt-2 animate-fade-in rounded-2xl neu-glass p-4 md:hidden">
            <nav className="flex flex-col">
              {(isLoggedIn ? loggedInLinks : loggedOutLinks).map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {isLoggedIn ? (
                <a
                  href={`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/auth/logout`}
                  className="rounded-xl neu-inset px-4 py-2.5 text-center text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  Logout
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  className="rounded-xl neu-inset px-4 py-2.5 text-sm font-semibold text-foreground"
                >
                  Sign In / Sign Up
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
