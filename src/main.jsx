import React from "react";
import ReactDOM from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";

import App from "./App.jsx";
import { api } from "./services/api.js";
import { loadLocaleResources } from "./services/contentLoader.js";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The application root element was not found");
}

const root = ReactDOM.createRoot(rootElement);

const startApplication = async () => {
  const resources = await loadLocaleResources(async (locale) => {
    const response = await api.get(`/content/${locale}`);
    return response.data;
  });
  const preferredLocale = navigator.language.toLowerCase().startsWith("it")
    ? "it"
    : "gb";

  await i18next.init({
    interpolation: { escapeValue: false },
    lng: preferredLocale,
    fallbackLng: "gb",
    ns: ["global"],
    defaultNS: "global",
    resources,
  });

  root.render(
    <React.StrictMode>
      <I18nextProvider i18n={i18next}>
        <App />
      </I18nextProvider>
    </React.StrictMode>,
  );
};

startApplication().catch((error) => {
  console.error("Unable to load portfolio content from the API", error);
  root.render(
    <div role="alert" className="p-8 text-white">
      Portfolio content could not be loaded. Please try again later.
    </div>,
  );
});
