/* eslint-disable better-tailwindcss/no-unknown-classes */
import themes from "daisyui/functions/themeOrder";
import { useState } from "react";

const storageKey = "same-word-theme";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved && themes.includes(saved) ? saved : "system";
  });

  function chooseTheme(value: string) {
    setTheme(value);
    if (value === "system") localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, value);
  }

  return (
    <>
      <button
        type="button"
        className="btn"
        popoverTarget="theme-picker"
        style={{ anchorName: "--theme-picker" }}
      >
        主题
      </button>
      <div
        id="theme-picker"
        popover="auto"
        role="radiogroup"
        aria-label="页面主题"
        className="
          dropdown dropdown-end z-10 max-h-[min(24rem,70dvh)] w-52
          max-w-[calc(100dvw-1.5rem)] overflow-y-auto rounded-box bg-base-100
          p-2 shadow-lg
        "
        style={{ positionAnchor: "--theme-picker" }}
      >
        {["system", ...themes].map((value) => (
          <input
            key={value}
            type="radio"
            name="page-theme"
            value={value}
            aria-label={value === "system" ? "跟随系统" : value}
            className={`
              btn btn-block justify-start btn-ghost
              ${value === "system" ? "" : `theme-controller`}
            `}
            checked={theme === value}
            onChange={(event) => chooseTheme(event.currentTarget.value)}
          />
        ))}
      </div>
    </>
  );
}
