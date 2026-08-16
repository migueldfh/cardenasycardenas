import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatLocalDate(date: Date): string {
  const plainDate = Temporal.PlainDate.from({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  });
  return plainDate.toString();
}

export function parseLocalDate(dateStr: string): Date {
  const plainDate = Temporal.PlainDate.from(dateStr);
  return new Date(plainDate.year, plainDate.month - 1, plainDate.day);
}


