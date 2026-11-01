import type { CSSProperties } from "react";
import { useState } from "react";

export function GroupStars() {
  const [budget] = useState(() =>
    matchMedia("(min-width: 640px)").matches ? 24 : 12,
  );
  return (
    <div
      aria-hidden="true"
      data-group-stars
      className="pointer-events-none absolute inset-x-0 top-0 z-1 h-40"
    >
      {Array.from({ length: budget }, (_, index) => {
        const position = (index + 0.5) / budget;
        return (
          <svg
            key={position}
            data-star
            viewBox="0 0 24 24"
            className="absolute size-3 fill-secondary"
            style={
              {
                left: `${position * 100}%`,
                top: `${(index % 4) * 20}%`,
                "--drift": `${index % 2 ? 0.4 : -0.4}rem`,
              } as CSSProperties
            }
          >
            <path d="m12 0 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" />
          </svg>
        );
      })}
    </div>
  );
}
