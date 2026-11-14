import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import PrivateArea from "./components/PrivateArea.jsx";

const PortfolioPage = () => (
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

const PrivateRoute = () => {
  const { user, loading, authError } = useAuth();
  const location = useLocation();
  const { t } = useTranslation("global");

  if (loading) {
    return <div className="min-h-screen bg-primary" role="status" />;
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

  if (!user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <PrivateArea />;
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/private" element={<PrivateRoute />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<PortfolioPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;