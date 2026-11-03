import { type Locale, localeTags } from "./messages.js";

export type Format = {
  dateTime: (at: number) => string;
  decimal: (value: number, digits: number) => string;
};

// Locale-sensitive formatting kept free of React so it can be asserted directly.
export function createFormat(locale: Locale): Format {
  const tag = localeTags[locale];
  const dateTime = new Intl.DateTimeFormat(tag, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
  const decimals = new Map<number, Intl.NumberFormat>();
  return {
    dateTime: (at) => dateTime.format(at),
    decimal: (value, digits) => {
      let formatter = decimals.get(digits);
      if (!formatter) {
        formatter = new Intl.NumberFormat(tag, {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        });
        decimals.set(digits, formatter);
      }
      return formatter.format(value);
    },
  };
}
