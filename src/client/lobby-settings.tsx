import { useState } from "react";

import type { RoomView } from "../shared/protocol.js";
import type { Action } from "./App.js";

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
  const [name, setName] = useState(
    room.members.find((member) => member.id === playerId)?.name ?? "",
  );
  const [config, setConfig] = useState(room.config);
  return (
    <div
      className="
        mt-5 grid gap-6
        sm:grid-cols-2
      "
    >
      <form
        className="fieldset gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void action("player:rename", { name });
        }}
      >
        <label htmlFor="rename">修改展示 ID</label>
        <input
          id="rename"
          className="input w-full"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button className="btn" disabled={disabled || room.phase !== "WAITING"}>
          保存展示 ID
        </button>
      </form>
      {room.hostId === playerId ? (
        <form
          className="fieldset gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void action("room:configure", config);
          }}
        >
          <legend className="fieldset-legend">
            房主配置 · 保存后全员重新准备
          </legend>
          {(
            [
              { key: "capacity", label: "容量", min: 2, max: 99 },
              { key: "maxRounds", label: "最多轮数", min: 2, max: 999 },
              { key: "roundSeconds", label: "每轮秒数", min: 1, max: 600 },
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
            保存配置
          </button>
        </form>
      ) : (
        <p className="self-center text-sm">
          配置由房主调整。房主离线或离开后，转交给最早加入的在线成员。
        </p>
      )}
    </div>
  );
}
