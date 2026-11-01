import { useState } from "react";

import type { Action } from "./App.js";
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
        <p className="text-sm font-semibold tracking-widest">
          一起想，想一起。
        </p>
        <h1
          className="
            text-3xl/tight font-black
            sm:text-5xl/tight
          "
        >
          不同的起点，
          <br />
          同一个词。
        </h1>
        <p className="text-base/relaxed">
          各写一个词，从彼此的答案里寻找连接。你们的想法，会在第几轮相遇？
        </p>
      </section>
      <section className="card bg-base-100 shadow-sm card-border">
        <div
          className="
            card-body gap-4 p-4
            sm:p-6
          "
        >
          <h2 className="card-title">
            {inviteCode !== null ? "加入朋友的房间" : "开始一场默契实验"}
          </h2>
          {online && inviteCode !== null && <InviteStatus code={inviteCode} />}
          <form
            className="fieldset gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void action("room:join", { name, code: inviteCode ?? code });
            }}
          >
            <label htmlFor="display-name">展示 ID</label>
            <input
              id="display-name"
              className="input w-full"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="nickname"
              placeholder="你希望朋友怎么称呼你"
              aria-invalid={!!error}
              aria-describedby={`name-hint${error ? " form-error" : ""}`}
            />
            <p id="name-hint">1～20 个字符，同房间内不能重名。</p>
            {inviteCode === null && (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={disabled}
                  onClick={() => void action("room:create", { name })}
                >
                  创建房间
                </button>
                <label htmlFor="room-code" className="mt-2">
                  已有邀请？输入房间码
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
                  placeholder="6 位房间码"
                  aria-describedby={error ? "form-error" : undefined}
                />
              </>
            )}
            <button
              className={inviteCode !== null ? "btn btn-primary" : "btn"}
              disabled={disabled}
            >
              加入房间
            </button>
          </form>
        </div>
      </section>
      <details
        className="
          collapse-arrow collapse border border-base-300 bg-base-100
          md:col-span-2
        "
      >
        <summary className="collapse-title font-semibold">怎么玩？</summary>
        <div className="collapse-content text-sm/relaxed">
          每轮各写一个词，揭晓后连接上一轮的所有答案。部分同词每人
          +1，全员同词每人 +100。 已揭晓的词不能再用；全员准备后一起开始。
        </div>
      </details>
    </div>
  );
}
