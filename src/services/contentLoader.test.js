import assert from "node:assert/strict";
import test from "node:test";
import { loadLocaleResources } from "./contentLoader.js";

test("loads both API locales into the i18next global namespace", async () => {
  const requestedLocales = [];

  const resources = await loadLocaleResources(async (locale) => {
    requestedLocales.push(locale);
    return { locale };
  });

  assert.deepEqual(requestedLocales.sort(), ["gb", "it"]);
  assert.deepEqual(resources, {
    it: { global: { locale: "it" } },
    gb: { global: { locale: "gb" } },
  });
});

test("does not return partial resources when a locale request fails", async () => {
  const error = new Error("API unavailable");
  error.response = { status: 400 };

  await assert.rejects(
    loadLocaleResources(async (locale) => {
      if (locale === "it") {
        throw error;
      }

      return {};
    }),
    /API unavailable/,
  );
});

test("retries transient network failures before returning locale content", async () => {
  const attempts = new Map();

  const resources = await loadLocaleResources(async (locale) => {
    const attempt = attempts.get(locale) ?? 0;
    attempts.set(locale, attempt + 1);
    if (attempt === 0) {
      const error = new Error("Backend is still starting");
      error.request = {};
      throw error;
    }

    return { locale };
  });

  assert.deepEqual([...attempts.values()], [2, 2]);
  assert.deepEqual(resources.it.global, { locale: "it" });
  assert.deepEqual(resources.gb.global, { locale: "gb" });
});

test("retries temporary server errors but does not hide a persistent failure", async () => {
  const attempts = new Map();
  const resources = await loadLocaleResources(async (locale) => {
    const attempt = attempts.get(locale) ?? 0;
    attempts.set(locale, attempt + 1);
    if (attempt === 0) {
      const error = new Error("Backend is still starting");
      error.request = {};
      error.response = { status: 503 };
      throw error;
    }

    return { locale };
  });

  assert.deepEqual([...attempts.values()], [2, 2]);
  assert.deepEqual(resources.gb.global, { locale: "gb" });
});
