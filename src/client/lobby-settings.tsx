import { useState } from "react";

import type { RoomView } from "../shared/protocol.js";
import type { Action } from "./App.js";
import { override, useLocale } from "./i18n/locale.js";

export function LobbySettings({
  room,
  playerId,
  disabled,
  action,
}: {
  room: RoomView;
  playerId: string;
  disabled: boolean;
  action: Action;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(
    room.members.find((member) => member.id === playerId)?.name ?? "",
  );
  const [config, setConfig] = useState(room.config);
  return (
    <div
      className="
        grid min-w-0 gap-6
        sm:grid-cols-2
      "
    >
      <form
        className="fieldset gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void action(
            "player:rename",
            { name },
            override("INVALID_INPUT", "invalidName"),
          );
        }}
      >
        <label htmlFor="rename">{t.settings.renameLabel}</label>
        <input
          id="rename"
          className="input w-full"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-describedby="form-error"
        />
        <button className="btn" disabled={disabled || room.phase !== "WAITING"}>
          {t.settings.renameSave}
        </button>
      </form>
      {room.hostId === playerId ? (
        <form
          className="fieldset gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void action(
              "room:configure",
              config,
              override("INVALID_INPUT", "invalidConfig"),
            );
          }}
        >
          <p className="font-semibold">{t.settings.hostConfig}</p>
          {(
            [
              {
                key: "capacity",
                label: t.settings.capacity,
                min: Math.max(2, room.members.length),
                max: 99,
              },
              {
                key: "maxRounds",
                label: t.settings.maxRounds,
                min: 2,
                max: 999,
              },
              {
                key: "roundSeconds",
                label: t.settings.roundSeconds,
                min: 1,
                max: 600,
              },
            ] as const
          ).map((field) => (
            <label className="fieldset" key={field.key}>
              {field.label}
              <input
                className="input w-full"
                type="number"
                min={field.min}
                max={field.max}
                step={1}
                value={config[field.key]}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    [field.key]: event.target.valueAsNumber,
                  })
                }
                required
              />
            </label>
          ))}
          <button
            className="btn"
            disabled={disabled || room.phase !== "WAITING"}
          >
            {t.settings.save}
          </button>
        </form>
      ) : (
        <p className="self-center text-sm">{t.settings.notHost}</p>
      )}
    </div>
  );
}
