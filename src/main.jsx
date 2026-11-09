import React from "react";
import ReactDOM from "react-dom/client";

import { I18nextProvider } from "react-i18next";
import i18next from "i18next";

import global_gb from "./locales/gb/global.json";
import global_it from "./locales/it/global.json";

import App from "./App.jsx";
import "./index.css";

i18next.init({
  interpolation: { escapeValue: false },
  lng: "auto",
  fallbackLng: "gb",
  resources: {
    gb: {
      global: global_gb,
    },
    it: {
      global: global_it,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18next}>
      <App />
    </I18nextProvider>
  </React.StrictMode>
);
