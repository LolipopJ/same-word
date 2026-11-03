import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ErrorCode } from "../../shared/protocol.js";
import { createFormat, type Format } from "./format.js";
import {
  type ClientErrorKey,
  type Dictionary,
  type Locale,
  locales,
  localeTags,
  messages,
} from "./messages.js";

export class LocaleError extends Error {
  constructor(readonly clientError: ClientErrorKey) {
    super(clientError);
  }
}

const storageKey = "same-word-locale";

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved && (locales as readonly string[]).includes(saved))
      return saved as Locale;
  } catch {
    // A blocked preference store still uses the entry's default language.
  }
  if (location.pathname === "/") return "zh";
  const preferred = navigator.languages?.[0] ?? navigator.language ?? "";
  return preferred.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export type { Format };

export type ErrorDescriptor =
  | { kind: "code"; code: string }
  | { kind: "override"; key: OverrideKey }
  | { kind: "client"; clientError: ClientErrorKey }
  | { kind: "unknown" };

export type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
  format: Format;
  describe: (error: unknown) => ErrorDescriptor;
  errorText: (error: ErrorDescriptor) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export type OverrideKey =
  "invalidConfig" | "invalidWord" | "invalidName" | "invalidJoin";

// Server `INVALID_INPUT` covers several constraints; call sites pick the
// descriptor that matches the action they just attempted.
export function override(
  code: ErrorCode,
  key: OverrideKey,
): Partial<Record<ErrorCode, ErrorDescriptor>> {
  return { [code]: { kind: "override", key } };
}

// Pure lookup so the same descriptor yields text in whatever language is current;
// this is what keeps an on-screen error translated after a switch.
export function errorTextFor(t: Dictionary, error: ErrorDescriptor): string {
  switch (error.kind) {
    case "code":
      return isKnownCode(error.code)
        ? t.errors.code[error.code]
        : t.errors.unknown;
    case "override":
      return t.errors[error.key];
    case "client":
      return t.errors.client[error.clientError];
    default:
      return t.errors.unknown;
  }
}

export function describeError(error: unknown): ErrorDescriptor {
  return error instanceof LocaleError
    ? { kind: "client", clientError: error.clientError }
    : { kind: "unknown" };
}

function isKnownCode(code: string): code is keyof Dictionary["errors"]["code"] {
  return Object.hasOwn(messages.zh.errors.code, code);
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detectLocale);
  const chooseLocale = useCallback((next: Locale) => {
    setLocale(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // Persisting is optional; the in-memory choice still applies.
    }
  }, []);
  const format = useMemo<Format>(() => createFormat(locale), [locale]);
  const t = messages[locale];
  useEffect(() => {
    document.documentElement.lang = localeTags[locale];
    document.title = t.document.title;
  }, [locale, t]);
  const errorText = useCallback(
    (error: ErrorDescriptor) => errorTextFor(t, error),
    [t],
  );
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: chooseLocale,
      t,
      format,
      describe: describeError,
      errorText,
    }),
    [locale, chooseLocale, t, format, errorText],
  );
  return <LocaleContext value={value}>{children}</LocaleContext>;
}

export function useLocale() {
  const value = use(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}
