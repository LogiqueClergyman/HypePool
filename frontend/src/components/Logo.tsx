"use client";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="2" width="5" height="22" rx="2.5" fill="currentColor" />
      <circle cx="14" cy="13" r="2.5" fill="currentColor" />
      <rect x="20" y="6" width="5" height="17" rx="2.5" fill="#6B6FE8" />
    </svg>
  );
}
