const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function isWeekdayDateKey(dateKey: string) {
  if (!dateKeyPattern.test(dateKey)) return false;
  const date = new Date(`${dateKey}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) return false;
  const day = date.getUTCDay();
  return day >= 1 && day <= 5;
}

export function nearestWeekday(date: Date) {
  const adjusted = new Date(date);
  const day = adjusted.getUTCDay();
  if (day === 6) adjusted.setUTCDate(adjusted.getUTCDate() - 1);
  if (day === 0) adjusted.setUTCDate(adjusted.getUTCDate() + 1);
  return adjusted;
}

export function buildWeekdayPackageDates(firstDateKey: string, appointmentCount: number, intervalDays: number) {
  const firstDate = new Date(`${firstDateKey}T12:00:00Z`);
  return Array.from({ length: appointmentCount }, (_, index) => {
    const date = new Date(firstDate);
    date.setUTCDate(date.getUTCDate() + intervalDays * index);
    return nearestWeekday(date).toISOString().slice(0, 10);
  });
}
