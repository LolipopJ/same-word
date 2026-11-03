import { access, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { Plugin } from "vite";

import { messages } from "../src/client/i18n/messages.js";

const t = messages.zh;

function escape(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

function homepage(): string {
  const h = Object.fromEntries(
    Object.entries(t.home).map(([key, value]) => [key, escape(value)]),
  );
  return `<main class="mx-auto max-w-4xl px-[max(0.75rem,env(safe-area-inset-left),env(safe-area-inset-right))] pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-[max(2rem,env(safe-area-inset-left),env(safe-area-inset-right))] sm:pt-[max(2rem,env(safe-area-inset-top))]">
    <header class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <a href="/" class="inline-flex min-h-11 items-center gap-2 text-xl font-black tracking-tight"><img src="/icon.svg" width="32" height="32" alt="" class="size-8" />${escape(t.app.brand)}</a>
      <div class="ml-auto flex min-w-0 flex-wrap items-center gap-2">
        <span class="badge invisible h-auto badge-outline py-1 text-center max-[390px]:hidden" aria-hidden="true">${escape(t.app.statusOnline)}</span>
        <a class="btn btn-square" href="https://github.com/LolipopJ/same-word" target="_blank" rel="noopener noreferrer" aria-label="${h.repository}" title="${h.repository}"><svg class="size-5" viewBox="0 0 256 256" aria-hidden="true"><use href="/toolbar-icons.svg#github-logo"></use></svg></a>
        <button class="btn btn-square" aria-label="${escape(t.language.label)}" title="${escape(t.language.label)}" disabled><svg class="size-5" viewBox="0 0 256 256" aria-hidden="true"><use href="/toolbar-icons.svg#translate"></use></svg></button>
        <button class="btn btn-square" aria-label="${escape(t.theme.label)}" title="${escape(t.theme.label)}" disabled><svg class="size-5" viewBox="0 0 256 256" aria-hidden="true"><use href="/toolbar-icons.svg#palette"></use></svg></button>
      </div>
    </header>
    <div class="grid gap-5 md:grid-cols-2 md:items-start md:gap-8">
      <section class="space-y-3 md:pt-6">
        <h1 class="text-3xl/tight font-black sm:text-5xl/tight">${h.heroLineOne}<br />${h.heroLineTwo}</h1>
        <p class="text-base/relaxed">${h.heroDescription}</p>
        <p class="text-sm/relaxed">${h.inviteDescription}</p>
      </section>
      <section class="card bg-base-100 shadow-sm card-border">
        <div class="card-body gap-4 p-4 sm:p-6">
          <div class="flex items-center justify-between gap-3">
            <h2 class="card-title min-w-0 flex-1">${h.createTitle}</h2>
            <button type="button" class="btn shrink-0 btn-ghost" disabled>${h.rulesSummary}</button>
          </div>
          <form class="fieldset gap-3">
            <label for="display-name">${h.displayName}</label>
            <input id="display-name" class="input w-full" placeholder="${h.displayNamePlaceholder}" aria-describedby="name-hint" disabled />
            <p id="name-hint">${h.nameHint}</p>
            <button type="button" class="btn btn-primary" disabled>${h.createRoom}</button>
            <label for="room-code" class="mt-2">${h.roomCodeLabel}</label>
            <input id="room-code" class="input w-full tracking-widest uppercase" placeholder="${h.roomCodePlaceholder}" disabled />
            <button class="btn" disabled>${h.joinRoom}</button>
          </form>
        </div>
      </section>
    </div>
    <noscript>
      <section class="card mt-5 bg-base-100 shadow-sm card-border">
        <div class="card-body gap-3 p-4 sm:p-6">
          <h2 class="card-title">${h.rulesSummary}</h2>
          <p class="text-sm/relaxed">${h.rulesBody}</p>
          <h3 class="font-semibold">${h.exampleTitle}</h3>
          <p class="text-sm/relaxed">${h.exampleBody}</p>
        </div>
      </section>
      <p class="mt-5 alert">${h.requiresJavaScript}</p>
    </noscript>
  </main>`;
}

export function searchIndexability(origin: string): Plugin {
  const url = `${origin}/`;
  const image = `${origin}/og-image.png`;
  return {
    name: "search-indexability",
    apply: "build",
    transformIndexHtml(html) {
      const metadata = [
        ["name", "description", t.document.description],
        ["property", "og:type", "website"],
        ["property", "og:site_name", t.app.brand],
        ["property", "og:locale", "zh_CN"],
        ["property", "og:title", t.document.title],
        ["property", "og:description", t.document.description],
        ["property", "og:url", url],
        ["property", "og:image", image],
        ["property", "og:image:type", "image/png"],
        ["property", "og:image:width", "1200"],
        ["property", "og:image:height", "630"],
        ["property", "og:image:alt", t.document.imageAlt],
        ["name", "twitter:card", "summary_large_image"],
        ["name", "twitter:title", t.document.title],
        ["name", "twitter:description", t.document.description],
        ["name", "twitter:image", image],
        ["name", "twitter:image:alt", t.document.imageAlt],
      ]
        .map(
          ([attribute, key, value]) =>
            `<meta ${attribute}="${key}" content="${escape(value!)}" />`,
        )
        .join("\n");
      const schema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: t.app.brand,
        description: t.document.description,
        url,
        image,
        inLanguage: "zh-CN",
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        isAccessibleForFree: true,
      }).replace(
        /[<>&\u2028\u2029]/g,
        (character) =>
          `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
      );
      return html
        .replace(
          "<!-- app-head -->",
          () =>
            `<title>${escape(t.document.title)}</title>\n${metadata}\n<link rel="canonical" href="${escape(url)}" />\n<script type="application/ld+json">${schema}</script>`,
        )
        .replace("<!-- app-home -->", homepage);
    },
    async writeBundle({ dir }) {
      // Missing preview dependencies must fail the release, even if Vite bundled successfully.
      await Promise.all(
        [
          "icon.svg",
          "toolbar-icons.svg",
          "icon-32.png",
          "apple-touch-icon.png",
          "icon-192.png",
          "icon-512.png",
          "og-image.png",
          "site.webmanifest",
        ].map((file) => access(join(dir!, file))),
      );
      await Promise.all([
        writeFile(
          join(dir!, "robots.txt"),
          `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
        ),
        writeFile(
          join(dir!, "sitemap.xml"),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(url)}</loc></url></urlset>\n`,
        ),
      ]);
    },
  };
}
