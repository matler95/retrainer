import type { Profile } from "@/store/useAppStore";

export function progressionHint(targetReps: string, completedReps: number[], lastWeight: number): {
  message: string;
  nextWeight: number;
} {
  const max = parseInt(targetReps.split("-").pop() || "0");
  const allHit = completedReps.length > 0 && completedReps.every(r => r >= max);
  if (allHit) {
    const inc = lastWeight >= 60 ? 2.5 : 1;
    return {
      message: `Crushed all target reps. Add ${inc}kg next session.`,
      nextWeight: lastWeight + inc,
    };
  }
  const avg = completedReps.reduce((a, b) => a + b, 0) / Math.max(1, completedReps.length);
  if (avg < parseInt(targetReps.split("-")[0]) * 0.7) {
    return { message: "Tough session. Repeat this weight next time.", nextWeight: lastWeight };
  }
  return { message: "Solid effort. Aim for top of rep range next time.", nextWeight: lastWeight };
}

export function coachOfTheDay(p: Profile | null, streak: number): string {
  if (!p) return "Let's build your plan.";
  const msgs = [
    `${streak}-day streak — keep the momentum.`,
    `Today is a great day to focus on form.`,
    `Small wins compound. Show up.`,
    `Your ${p.goal} plan is dialed in. Trust the process.`,
    `Hydration matters as much as the lift today.`,
  ];
  return msgs[new Date().getDate() % msgs.length];
}
