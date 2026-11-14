export const supportedLocales = ["it", "gb"];

const fetchLocaleWithRetry = async (fetchLocale, locale) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await fetchLocale(locale);
    } catch (error) {
      const retryableResponse = error.response?.status >= 500;
      const retryableNetworkError = !error.response && error.request;

      if ((!retryableResponse && !retryableNetworkError) || attempt === 4) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw new Error(`Unable to load locale "${locale}"`);
};

export const loadLocaleResources = async (fetchLocale) => {
  const localeEntries = await Promise.all(
    supportedLocales.map(async (locale) => [
      locale,
      { global: await fetchLocaleWithRetry(fetchLocale, locale) },
    ]),
  );

  return Object.fromEntries(localeEntries);
};
