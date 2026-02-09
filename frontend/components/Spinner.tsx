"use client";

import React from "react";

type Props = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export default function Spinner({ size = 40, className = "", strokeWidth = 3 }: Props) {
  const px = `${size}px`;
  return (
    <svg
      className={`spinner-svg ${className}`}
      width={px}
      height={px}
      viewBox="0 0 50 50"
      role="status"
      aria-label="Loading"
    >
      <circle
        cx="25"
        cy="25"
        r="20"
        strokeWidth={strokeWidth}
        stroke="currentColor"
        fill="none"
      />
    </svg>
  );
}
