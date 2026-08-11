"use client";
import { useEffect, useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const loggedOutLinks = [
  { label: "Features", href: "/#features" },
  { label: "Meetings", href: "/#workflow" },
  { label: "Tasks", href: "/#features" },
  { label: "Approvals", href: "/#workflow" },
];

const loggedInLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Calendar", href: "/calendar" },
  { label: "Meetings", href: "/meetings" },
  { label: "Schedule", href: "/schedule" },
  { label: "Tasks", href: "/tasks" },
  { label: "Teams", href: "/team" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(res => {
        if (res.ok) setIsLoggedIn(true);
      })
      .catch(() => {});
  }, []);

  const handleLogin = () => {
    if (isLoggedIn) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/api/auth/login";
    }
  };

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
          <a href="/" className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <Sparkles size={18} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-extrabold tracking-tight text-foreground">
                I-STEM
              </span>
              <span className="block truncate text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Internal
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex">
            {(isLoggedIn ? loggedInLinks : loggedOutLinks).map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {isLoggedIn ? (
              <a
                href="/api/auth/logout"
                className="rounded-xl neu-inset px-4 py-2 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:text-foreground"
              >
                Logout
              </a>
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
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {isLoggedIn ? (
                <a
                  href="/api/auth/logout"
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
