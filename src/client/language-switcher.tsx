import { useLocale } from "./i18n/locale.js";
import { locales } from "./i18n/messages.js";
import { PickerPopover } from "./picker-popover.js";

// Each language name stays in its own language so players who cannot read the
// current UI language can still find theirs.
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();
  return (
    <PickerPopover
      id="language-picker"
      trigger={
        <svg className="size-5" viewBox="0 0 256 256" aria-hidden="true">
          <use href="/toolbar-icons.svg#translate" />
        </svg>
      }
      label={t.language.label}
    >
      {locales.map((value) => (
        <input
          key={value}
          type="radio"
          name="interface-language"
          value={value}
          aria-label={t.language[value]}
          className="btn btn-block justify-start btn-ghost"
          checked={locale === value}
          onChange={() => setLocale(value)}
        />
      ))}
    </PickerPopover>
  );
}
