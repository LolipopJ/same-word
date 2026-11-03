import assert from "node:assert/strict";
import test from "node:test";

import type { ErrorCode } from "../../shared/protocol.js";
import { createFormat } from "./format.js";
import { type ErrorDescriptor, errorTextFor, override } from "./locale.js";
import { messages } from "./messages.js";

const errorCodes: ErrorCode[] = [
  "INVALID_INPUT",
  "CONFIG_BELOW_MEMBERS",
  "SESSION_REQUIRED",
  "TAKEN_OVER",
  "ROOM_NOT_FOUND",
  "ROOM_FULL",
  "ALREADY_IN_ROOM",
  "NOT_MEMBER",
  "NOT_HOST",
  "WRONG_PHASE",
  "NAME_TAKEN",
  "STALE_REQUEST",
  "FORFEITED",
  "ALREADY_SUBMITTED",
  "HISTORICAL_WORD",
];

function leaves(value: unknown, path = ""): Map<string, unknown> {
  const result = new Map<string, unknown>();
  for (const [key, child] of Object.entries(value as object)) {
    const next = path ? `${path}.${key}` : key;
    if (typeof child === "object" && child !== null)
      for (const [inner, leaf] of leaves(child, next)) result.set(inner, leaf);
    else result.set(next, child);
  }
  return result;
}

test("both locales expose the same keys with usable leaves", () => {
  const zh = leaves(messages.zh);
  const en = leaves(messages.en);
  assert.deepEqual([...en.keys()].sort(), [...zh.keys()].sort());
  for (const dictionary of [messages.zh, messages.en]) {
    for (const [path, leaf] of leaves(dictionary)) {
      if (typeof leaf === "string")
        assert.ok(leaf.length > 0, `${path} is empty`);
      else
        assert.equal(
          typeof leaf,
          "function",
          `${path} has an unsupported type`,
        );
    }
  }
});

test("every error code has its own localized message", () => {
  for (const dictionary of [messages.zh, messages.en]) {
    const code = dictionary.errors.code;
    assert.deepEqual(Object.keys(code).sort(), [...errorCodes].sort());
    for (const value of Object.values(code))
      assert.notEqual(value, dictionary.errors.unknown);
  }
});

test("each error descriptor kind resolves to its own entry", () => {
  const cases: {
    descriptor: ErrorDescriptor;
    expected: Record<"zh" | "en", string>;
  }[] = [
    {
      descriptor: { kind: "code", code: "ROOM_FULL" },
      expected: {
        zh: messages.zh.errors.code.ROOM_FULL,
        en: messages.en.errors.code.ROOM_FULL,
      },
    },
    {
      descriptor: override("INVALID_INPUT", "invalidJoin").INVALID_INPUT!,
      expected: {
        zh: messages.zh.errors.invalidJoin,
        en: messages.en.errors.invalidJoin,
      },
    },
    {
      descriptor: { kind: "client", clientError: "connectionLost" },
      expected: {
        zh: messages.zh.errors.client.connectionLost,
        en: messages.en.errors.client.connectionLost,
      },
    },
  ];
  for (const { descriptor, expected } of cases) {
    // Exact match proves the branch is reached instead of the fallback.
    assert.equal(errorTextFor(messages.zh, descriptor), expected.zh);
    assert.equal(errorTextFor(messages.en, descriptor), expected.en);
    assert.notEqual(expected.zh, expected.en);
  }
  assert.equal(
    errorTextFor(messages.en, { kind: "unknown" }),
    messages.en.errors.unknown,
  );
  assert.equal(
    errorTextFor(messages.zh, { kind: "code", code: "NOT_A_CODE" }),
    messages.zh.errors.unknown,
  );
});

test("formatters follow the selected locale", () => {
  const at = Date.UTC(2026, 10, 3, 1, 15, 16);
  const zh = createFormat("zh");
  const en = createFormat("en");
  const zhDate = zh.dateTime(at);
  const enDate = en.dateTime(at);
  // Locale order and wording differ, so both must be distinct and non-empty.
  assert.ok(zhDate.length > 0 && enDate.length > 0);
  assert.notEqual(zhDate, enDate);
  assert.match(zhDate, /2026/);
  assert.match(enDate, /2026/);

  // Grouped digits prove the locale formatter is used instead of `toFixed`.
  assert.equal(en.decimal(1234567.8, 1), "1,234,567.8");
  assert.equal(zh.decimal(1234567.8, 1), "1,234,567.8");
  assert.notEqual(en.decimal(1234567.8, 1), (1234567.8).toFixed(1));
  // One decimal is always shown, matching the previous `toFixed(1)` output.
  assert.equal(en.decimal(60, 1), "60.0");
  assert.equal(zh.decimal(25.94, 1), "25.9");
});

test("locale function leaves accept their declared arguments", () => {
  for (const dictionary of [messages.zh, messages.en]) {
    assert.equal(typeof dictionary.game.roundTitle(2, 20), "string");
    assert.equal(typeof dictionary.game.submitted("apple"), "string");
    assert.equal(typeof dictionary.answers.groupSummary(1, 3, 1), "string");
    assert.equal(typeof dictionary.results.summary(5, 3, 2), "string");
    assert.equal(typeof dictionary.results.forfeitLine(2, "timeout"), "string");
    assert.equal(typeof dictionary.lobby.membersSummary(3, 8), "string");
  }
});
