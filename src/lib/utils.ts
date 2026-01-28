import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes with proper precedence
 * Uses clsx for conditional class handling and tailwind-merge for deduplication
 */
export const cn = (...inputs: ClassValue[]) => {
    return twMerge(clsx(inputs));
};
