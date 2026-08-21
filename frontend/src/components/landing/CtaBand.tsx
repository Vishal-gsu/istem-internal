"use client";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Reveal } from "./Reveal";

export function CtaBand() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/me`, { credentials: "include" })
      .then(res => {
        if (res.ok) setIsLoggedIn(true);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="w-full py-16 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-rust-deep via-primary to-rust-soft px-6 py-14 text-center shadow-2xl shadow-primary/25 sm:px-12 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary-foreground/15 blur-3xl"
            />
            <h2 className="relative font-display text-[clamp(1.8rem,3.4vw,2.6rem)] font-extrabold tracking-tight text-primary-foreground">
              Ready to run your week from one hub?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
              Sign in with your I-STEM internal account and pick up right where the team left off.
            </p>
            <a
              href={isLoggedIn ? "/dashboard" : `${process.env.NEXT_PUBLIC_API_BASE_URL || '/sync/api'}/auth/login`}
              className="group relative mt-9 inline-flex items-center justify-center gap-2 rounded-2xl bg-card px-8 py-4 text-sm font-semibold text-foreground shadow-xl transition-all duration-300 hover:scale-[1.03]"
            >
              {isLoggedIn ? "Dashboard" : "Get Started"}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
