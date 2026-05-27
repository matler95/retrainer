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
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur safe-pb">
      <div className="app-shell flex items-stretch justify-around px-2">
        {tabs.map(({ to, label, Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-14 min-h-14 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("size-5", active && "stroke-[2.5]")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
