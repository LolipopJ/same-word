import assert from "node:assert/strict";
import test from "node:test";

import { normalizeText } from "./words.js";

test("word keys trim and ignore case without changing other writing", () => {
  assert.deepEqual(normalizeText(" Apple "), { text: "Apple", key: "apple" });
  assert.equal(normalizeText("apple").key, normalizeText(" Apple ").key);
  assert.notEqual(normalizeText("苹果").key, normalizeText("蘋果").key);
  assert.notEqual(normalizeText("apple").key, normalizeText("apple!").key);
  assert.equal([...normalizeText("😀".repeat(20)).text].length, 20);
});
test("empty, long and control-containing words are rejected", () => {
  for (const word of [
    "",
    "  ",
    "😀".repeat(21),
    "a\nb",
    "a\tb",
    "a\u0000b",
    "a\u2028b",
  ]) {
    assert.throws(() => normalizeText(word));
  }
});
