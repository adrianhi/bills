import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'DOP') {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: currency === 'USD' ? 'USD' : 'DOP',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-DO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
