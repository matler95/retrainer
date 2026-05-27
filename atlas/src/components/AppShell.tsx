import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function AppShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("app-shell min-h-dvh pb-24 safe-pt px-4", className)}>{children}</div>
  );
}

export function AppHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header className="flex items-center justify-between py-4">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {right}
    </header>
  );
}

export function StatCard({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-4 bg-card", accent && "border-primary/40 bg-primary/5")}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold font-display">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mt-6 mb-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{children}</h2>
      {right}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border bg-card p-4", className)}>{children}</div>;
}
