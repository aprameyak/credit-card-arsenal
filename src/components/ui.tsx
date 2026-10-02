"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-rise">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-signal">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-bone sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-bone-muted sm:text-base">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function Panel({
  children,
  className,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className={cn("glass-panel rounded-lg p-5 sm:p-6", className)}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h2 className="font-display text-lg font-semibold text-bone">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-bone-muted">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "signal" | "amber" | "danger";
}) {
  const valueClass =
    tone === "signal"
      ? "text-signal"
      : tone === "amber"
        ? "text-amber"
        : tone === "danger"
          ? "text-danger"
          : "text-bone";

  return (
    <div className="rounded-md border border-line bg-ink-elevated/50 px-4 py-3">
      <p className="text-xs uppercase tracking-wider text-bone-dim">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-semibold", valueClass)}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-bone-dim">{hint}</p>}
    </div>
  );
}

const badgeTones = {
  default: "border-line text-bone-muted bg-ink-elevated/80",
  signal: "border-signal/30 text-signal bg-signal/10",
  amber: "border-amber/30 text-amber bg-amber/10",
  danger: "border-danger/30 text-danger bg-danger/10",
} as const;

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof badgeTones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const buttonVariants = {
  primary:
    "bg-signal text-ink hover:bg-signal/90 border border-signal/50 shadow-[0_0_24px_rgba(46,196,166,0.2)]",
  secondary:
    "bg-transparent text-bone border border-line-strong hover:border-signal/40 hover:bg-panel-hover",
  ghost: "bg-transparent text-bone-muted border border-transparent hover:text-bone hover:bg-panel-hover",
  danger:
    "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
} as const;

export function Button({
  children,
  className,
  variant = "primary",
  href,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  href?: string;
}) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:pointer-events-none disabled:opacity-50",
    buttonVariants[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}

export function VerifiedAt({ date }: { date: string }) {
  return (
    <p className="text-[11px] text-bone-dim">
      Verified{" "}
      <time dateTime={date} className="font-mono text-bone-muted">
        {date}
      </time>
    </p>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-14 text-center animate-rise">
      <p className="font-display text-lg font-semibold text-bone">{title}</p>
      {description && (
        <p className="mt-2 max-w-md text-sm text-bone-muted">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
