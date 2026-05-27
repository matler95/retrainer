/**
 * Local notification helpers for workout reminders and alerts.
 *
 * Uses the Notification API (Web) with graceful degradation.
 * On iOS Safari, notifications require PWAs added to the home screen.
 * Falls back silently when notifications are unsupported.
 */

const NOTIFICATION_ICON = "/icons/icon-192.png";

/**
 * Request notification permission.
 * Returns true if permission is granted or already granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

/**
 * Check if notification permission is currently granted.
 */
export function hasNotificationPermission(): boolean {
  if (!("Notification" in window)) return false;
  return Notification.permission === "granted";
}

/**
 * Schedule a local notification for a specific time.
 * Uses the Notification API.
 *
 * NOTE: This does NOT persist across app restarts.
 * For persistent reminders, use the Service Worker + push events.
 * For now, this works while the PWA is open or recently active.
 *
 * TODO: Future AI integration point — use push subscription for
 * server-side reminders (e.g., missed workout, plateau detected).
 */
export function scheduleWorkoutReminder(
  dayName: string,
  hour: number,
  minute: number,
): () => void {
  if (!hasNotificationPermission()) return () => {};

  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);

  // If target time is already past today, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const msUntil = target.getTime() - now.getTime();

  const timeoutId = setTimeout(() => {
    showWorkoutReminder(dayName);
  }, msUntil);

  // Return a cleanup function
  return () => clearTimeout(timeoutId);
}

/**
 * Show a workout reminder notification immediately.
 */
export function showWorkoutReminder(dayName: string): void {
  if (!hasNotificationPermission()) return;

  try {
    new Notification("Coach — Time to Train 💪", {
      body: `Your "${dayName}" workout is ready. Let's get it.`,
      icon: NOTIFICATION_ICON,
      tag: "workout-reminder",
      requireInteraction: true,
    });
  } catch {
    // Silently fail — notifications are best-effort
  }
}

/**
 * Show a readiness-based notification suggesting rest or training.
 */
export function showReadinessNotification(
  score: number,
  message: string,
): void {
  if (!hasNotificationPermission()) return;

  const title = score >= 70 ? "Ready to train 💪" : "Consider resting 🧘";

  try {
    new Notification(title, {
      body: message,
      icon: NOTIFICATION_ICON,
      tag: "readiness",
    });
  } catch {
    // Silently fail
  }
}

/**
 * Show a generic achievement notification.
 */
export function showAchievementNotification(title: string, body: string): void {
  if (!hasNotificationPermission()) return;

  try {
    new Notification(`🏆 ${title}`, {
      body,
      icon: NOTIFICATION_ICON,
      tag: "achievement",
    });
  } catch {
    // Silently fail
  }
}