import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utilitas untuk menggabungkan class Tailwind CSS dengan cerdas
 * Mengatasi konflik class (misal p-2 dan p-4 menjadi p-4)
 *
 * @param  {...any} inputs Array of class values (string, object, array)
 * @returns {string} String class yang sudah digabung
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
