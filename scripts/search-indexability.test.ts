import assert from "node:assert/strict";
import test from "node:test";

import { messages } from "../src/client/i18n/messages.js";
import { searchIndexability } from "./search-indexability.js";

test("HTML injection preserves literal replacement tokens and JSON text", async (t) => {
  const description = messages.zh.document.description;
  const introduction = messages.zh.home.heroDescription;
  t.after(() => {
    messages.zh.document.description = description;
    messages.zh.home.heroDescription = introduction;
  });
  const text = `文字 <>&"' </script> $& $$`;
  messages.zh.document.description = text;
  messages.zh.home.heroDescription = "$& $$";
  const transform = searchIndexability(
    "https://sameword.example.com",
  ).transformIndexHtml;
  assert.ok(typeof transform === "function");
  const html = await transform("<!-- app-head --><!-- app-home -->", {
    filename: "index.html",
    path: "/",
  });
  assert.ok(typeof html === "string");
  const json = html.match(
    /<script type="application\/ld\+json">(.*?)<\/script>/s,
  )?.[1];
  assert.ok(json);
  assert.equal(JSON.parse(json).description, text);
  assert.match(html.slice(html.indexOf("<main")), /\$&amp; \$\$/);
});
