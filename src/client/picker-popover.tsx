import { type CSSProperties, type ReactNode } from "react";

// Shared popover shell for header pickers: one accessible radiogroup pattern,
// anchored to its trigger button.
export function PickerPopover({
  id,
  trigger,
  label,
  scrollable = false,
  children,
}: {
  id: string;
  trigger: ReactNode;
  label: string;
  scrollable?: boolean;
  children: ReactNode;
}) {
  const anchor = `--${id}`;
  return (
    <>
      <button
        type="button"
        className="btn"
        popoverTarget={id}
        style={{ anchorName: anchor } as CSSProperties}
      >
        {trigger}
      </button>
      <div
        id={id}
        popover="auto"
        role="radiogroup"
        aria-label={label}
        className={`
          dropdown dropdown-end z-10 w-52 max-w-[calc(100dvw-1.5rem)]
          rounded-box bg-base-100 p-2 shadow-lg
          ${scrollable ? "max-h-[min(24rem,70dvh)] overflow-y-auto" : ""}
        `}
        style={{ positionAnchor: anchor } as CSSProperties}
      >
        {children}
      </div>
    </>
  );
}
