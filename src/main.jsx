import React from "react";
import ReactDOM from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";

import App from "./App.jsx";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("The application root element was not found");
}

const root = ReactDOM.createRoot(rootElement);

const preferredLocale = navigator.language.toLowerCase().startsWith("it")
  ? "it"
  : "gb";

const startApplication = () =>
  i18next.init({
    interpolation: { escapeValue: false },
    lng: preferredLocale,
    fallbackLng: "gb",
    ns: ["global"],
    defaultNS: "global",
    resources: {
      it: {
        global: {
          Auth: {
            LoginTitle: "Accedi",
            Email: "Email",
            Password: "Password",
            InvalidCredentials: "Email o password non validi.",
            LoggingIn: "Accesso in corso...",
            LoginButton: "Accedi",
            PrivateLoading: "Caricamento dell'area privata...",
            PrivateError: "Impossibile verificare la sessione privata.",
          },
        },
      },
      gb: {
        global: {
          Auth: {
            LoginTitle: "Log in",
            Email: "Email",
            Password: "Password",
            InvalidCredentials: "Invalid email or password.",
            LoggingIn: "Logging in...",
            LoginButton: "Log in",
            PrivateLoading: "Loading your private area...",
            PrivateError: "Unable to verify your private session.",
          },
        },
      },
    },
  });

startApplication()
  .then(() =>
    root.render(
      <React.StrictMode>
        <I18nextProvider i18n={i18next}>
          <App />
        </I18nextProvider>
      </React.StrictMode>,
    ),
  )
  .catch((error) => {
    console.error("Unable to initialize application translations", error);
    root.render(
      <div role="alert" className="p-8 text-white">
        The application could not be initialized. Please try again later.
      </div>,
    );
  });
