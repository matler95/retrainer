import type { Profile } from "@/store/useAppStore";

export function maintenanceCalories(p: Pick<Profile, "age" | "gender" | "heightCm" | "weightKg" | "activity">) {
  // Mifflin-St Jeor
  const s = p.gender === "female" ? -161 : 5;
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + s;
  const mult = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    high: 1.725,
  }[p.activity ?? "moderate"];
  return Math.round(bmr * mult);
}

export function goalCalories(p: Profile) {
  const maint = maintenanceCalories(p);
  switch (p.goal) {
    case "lose fat": return maint - 400;
    case "build muscle": return maint + 250;
    case "strength": return maint + 150;
    case "recomposition": return maint;
    default: return maint;
  }
}

export function proteinTargetG(p: Profile) {
  const perKg = p.goal === "build muscle" || p.goal === "strength" ? 2.0 : 1.6;
  return Math.round(p.weightKg * perKg);
}

export function waterTargetMl(p: Profile) {
  return Math.round(p.weightKg * 35);
}
