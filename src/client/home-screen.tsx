import { useRef, useState } from "react";

import type { Action } from "./App.js";
import { override, useLocale } from "./i18n/locale.js";
import { InviteStatus } from "./invite-status.js";

export function HomeScreen({
  inviteCode,
  online,
  disabled,
  error,
  action,
}: {
  inviteCode: string | null;
  online: boolean;
  disabled: boolean;
  error: string;
  action: Action;
}) {
  const { t } = useLocale();
  const rulesDialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  return (
    <div
      className="
        grid gap-5
        md:grid-cols-2 md:items-start md:gap-8
      "
    >
      <section
        className="
          space-y-3
          md:pt-6
        "
      >
        <h1
          className="
            text-3xl/tight font-black
            sm:text-5xl/tight
          "
        >
          {t.home.heroLineOne}
          <br />
          {t.home.heroLineTwo}
        </h1>
        <p className="text-base/relaxed">{t.home.heroDescription}</p>
        <p className="text-sm/relaxed">{t.home.inviteDescription}</p>
      </section>
      <section className="card bg-base-100 shadow-sm card-border">
        <div
          className="
            card-body gap-4 p-4
            sm:p-6
          "
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="card-title min-w-0 flex-1">
              {inviteCode !== null
                ? t.home.joinInviteTitle
                : t.home.createTitle}
            </h2>
            <button
              type="button"
              className="btn shrink-0 btn-ghost"
              aria-haspopup="dialog"
              onClick={() => rulesDialogRef.current?.showModal()}
            >
              {t.home.rulesSummary}
            </button>
          </div>
          {online && inviteCode !== null && <InviteStatus code={inviteCode} />}
          <form
            className="fieldset gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void action(
                "room:join",
                { name, code: inviteCode ?? code },
                override("INVALID_INPUT", "invalidJoin"),
              );
            }}
          >
            <label htmlFor="display-name">{t.home.displayName}</label>
            <input
              id="display-name"
              className="input w-full"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="nickname"
              placeholder={t.home.displayNamePlaceholder}
              aria-invalid={!!error}
              aria-describedby={`name-hint${error ? " form-error" : ""}`}
            />
            <p id="name-hint">{t.home.nameHint}</p>
            {inviteCode === null && (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={disabled}
                  onClick={() =>
                    void action(
                      "room:create",
                      { name },
                      override("INVALID_INPUT", "invalidName"),
                    )
                  }
                >
                  {t.home.createRoom}
                </button>
                <label htmlFor="room-code" className="mt-2">
                  {t.home.roomCodeLabel}
                </label>
                <input
                  id="room-code"
                  className="input w-full tracking-widest uppercase"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.toUpperCase())
                  }
                  maxLength={6}
                  autoComplete="off"
                  placeholder={t.home.roomCodePlaceholder}
                  aria-describedby={error ? "form-error" : undefined}
                />
              </>
            )}
            <button
              className={inviteCode !== null ? "btn btn-primary" : "btn"}
              disabled={disabled}
            >
              {t.home.joinRoom}
            </button>
          </form>
        </div>
      </section>
      <dialog
        ref={rulesDialogRef}
        id="rules-dialog"
        className="modal"
        aria-labelledby="rules-title"
      >
        <div className="modal-box space-y-3">
          <h2 id="rules-title" className="text-lg font-bold">
            {t.home.rulesSummary}
          </h2>
          <p className="text-sm/relaxed">{t.home.rulesBody}</p>
          <h3 className="font-semibold">{t.home.exampleTitle}</h3>
          <p className="text-sm/relaxed">{t.home.exampleBody}</p>
          <form method="dialog" className="modal-action">
            <button className="btn">{t.home.closeRules}</button>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>{t.home.closeRules}</button>
        </form>
      </dialog>
    </div>
  );
}
