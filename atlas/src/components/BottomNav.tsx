import { Link, useLocation } from "@tanstack/react-router";
import { Home, Dumbbell, BookOpen, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/plan", label: "Plan", Icon: Dumbbell },
  { to: "/library", label: "Library", Icon: BookOpen },
  { to: "/progress", label: "Progress", Icon: TrendingUp },
  { to: "/profile", label: "Profile", Icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  const hidden = pathname.startsWith("/onboarding") || pathname.startsWith("/workout");
  if (hidden) return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur-lg safe-pb"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="app-shell flex items-stretch justify-around px-1">
        {tabs.map(({ to, label, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-16 min-h-[3.25rem] text-[10px] font-medium transition-colors rounded-xl tap-scale",
                active
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <span className="absolute inset-x-2 -top-px h-[2px] rounded-full bg-accent" />
              )}
              <Icon className={cn("size-5 transition-all", active && "stroke-[2.5] scale-105")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}