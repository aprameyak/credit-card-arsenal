"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import { useArsenalStore } from "@/lib/store";

const ENGINES = [
  {
    title: "Arsenal Engine",
    body: "Roles, overlap, coverage gaps, and fee justification across your whole wallet.",
  },
  {
    title: "Pathway Engine",
    body: "Sequence cards toward a target arsenal — cashback, points, or travel paths.",
  },
  {
    title: "Spending Engine",
    body: "Route each category and purchase to the best card you already hold.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const loadDemo = useArsenalStore((s) => s.loadDemo);

  function tryDemo() {
    loadDemo();
    router.push("/arsenal");
  }

  return (
    <div className="relative min-h-screen overflow-hidden app-atmosphere">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(46,196,166,0.16),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_45%,#070b14_92%)]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-bold text-bone">Arsenal</span>
        <button
          type="button"
          onClick={tryDemo}
          className="text-sm text-bone-muted hover:text-signal transition"
        >
          Try demo wallet
        </button>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col justify-center px-6 pb-24">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-signal"
        >
          Build your credit-card arsenal
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.04 }}
          className="font-display text-6xl font-extrabold tracking-tight text-bone sm:text-7xl md:text-8xl"
        >
          Arsenal
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-bone-muted"
        >
          Stop optimizing cards in isolation. Map coverage, fill wallet gaps,
          sequence applications, and route every purchase through a coordinated
          system.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="mt-4 max-w-xl text-sm text-bone-dim"
        >
          Guest mode: try the demo wallet without an account — your profile stays
          in this browser only until you reset it in Settings.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center rounded-md bg-signal px-5 py-3 text-sm font-bold text-ink hover:brightness-110 transition"
          >
            Build your profile
          </Link>
          <Button variant="secondary" onClick={tryDemo}>
            Explore demo arsenal
          </Button>
        </motion.div>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-20 grid gap-6 border-t border-line pt-10 sm:grid-cols-3"
        >
          {ENGINES.map((e) => (
            <article key={e.title}>
              <h2 className="font-display text-lg font-semibold text-bone">
                {e.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-bone-muted">
                {e.body}
              </p>
            </article>
          ))}
        </motion.section>
      </main>
    </div>
  );
}
