import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18next from "i18next";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

import {
  About,
  Contact,
  Experience,
  Hero,
  Navbar,
  Tech,
  Works,
  StarsCanvas,
} from "./components";

import Login from "./components/Login.jsx";
import LifeArea from "./life/LifeArea.jsx";
import { api } from "./services/api.js";
import { loadLocaleResources } from "./services/contentLoader.js";

let portfolioContentRequest;

const getPortfolioContent = () => {
  if (!portfolioContentRequest) {
    portfolioContentRequest = loadLocaleResources(async (locale) => {
      const response = await api.get(`/content/${locale}`);
      return response.data;
    }).catch((error) => {
      portfolioContentRequest = undefined;
      throw error;
    });
  }
  return portfolioContentRequest;
};

const PortfolioPage = () => {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let active = true;
    const preferredLocale = navigator.language.toLowerCase().startsWith("it")
      ? "it"
      : "gb";

    getPortfolioContent()
      .then(async (resources) => {
        for (const [locale, namespaces] of Object.entries(resources)) {
          i18next.addResourceBundle(
            locale,
            "global",
            namespaces.global,
            true,
            true,
          );
        }
        await i18next.changeLanguage(preferredLocale);
        if (active) setStatus("ready");
      })
      .catch((error) => {
        console.error("Unable to load portfolio content from the API", error);
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  if (status === "loading") {
    return <div className="min-h-screen bg-primary" role="status" />;
  }

  if (status === "error") {
    return (
      <div role="alert" className="p-8 text-white">
        Portfolio content could not be loaded. Please try again later.
      </div>
    );
  }

  return (
    <div className="relative z-0 bg-primary">
      <div className="bg-hero-pattern bg-cover bg-no-repeat bg-center">
        <Navbar />
        <Hero />
      </div>
      <StarsCanvas />
      <About />
      <Experience />
      <Tech />
      <Works />
      <div className="relative z-0">
        <Contact />
      </div>
    </div>
  );
};

const PrivateRoute = () => {
  const { user, loading, authError } = useAuth();
  const location = useLocation();
  const { t } = useTranslation("global");
  if (loading) {
    return (
      <main className="min-h-screen bg-primary p-8 text-white" role="status">
        {t("Auth.PrivateLoading")}
      </main>
    );
  }

  if (authError) {
    return (
      <main
        className="min-h-screen bg-primary px-6 py-24 text-white"
        role="alert"
      >
        {t("Auth.PrivateError")}
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <LifeArea />;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/private/*" element={<PrivateRoute />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<PortfolioPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;