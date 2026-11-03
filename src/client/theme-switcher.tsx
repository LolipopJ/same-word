/* eslint-disable better-tailwindcss/no-unknown-classes */
import themes from "daisyui/functions/themeOrder";
import { useState } from "react";

import { useLocale } from "./i18n/locale.js";
import { PickerPopover } from "./picker-popover.js";

const storageKey = "same-word-theme";

export function ThemeSwitcher() {
  const { t } = useLocale();
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
    <PickerPopover
      id="theme-picker"
      trigger={t.theme.button}
      label={t.theme.label}
      scrollable
    >
      {["system", ...themes].map((value) => (
        <input
          key={value}
          type="radio"
          name="page-theme"
          value={value}
          aria-label={value === "system" ? t.theme.system : value}
          className={`
            btn btn-block justify-start btn-ghost
            ${value === "system" ? "" : `theme-controller`}
          `}
          checked={theme === value}
          onChange={(event) => chooseTheme(event.currentTarget.value)}
        />
      ))}
    </PickerPopover>
  );
}
