import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

const PrivateArea = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation("global");
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    api
      .get("/auth/private")
      .then(() => {
        if (active) {
          setVerified(true);
        }
      })
      .catch((requestError) => {
        console.error("Unable to verify private-area access", requestError);
        if (active) {
          setError(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-primary px-6 py-24 text-white">
      <section className="mx-auto max-w-3xl rounded-2xl bg-black-100 p-8">
        <h1 className="mb-4 text-3xl font-bold">{t("Auth.PrivateTitle")}</h1>
        <p className="mb-6">{t("Auth.PrivateWelcome", { name: user?.name })}</p>
        {verified ? (
          <p role="status">{t("Auth.PrivateReady")}</p>
        ) : error ? (
          <p role="alert">{t("Auth.PrivateError")}</p>
        ) : (
          <p role="status">{t("Auth.VerifyingAccess")}</p>
        )}
        <div className="mt-8 flex gap-4">
          <Link to="/" className="underline">
            {t("Auth.ReturnToPortfolio")}
          </Link>
          <button type="button" className="underline" onClick={handleLogout}>
            {t("Auth.Logout")}
          </button>
        </div>
      </section>
    </main>
  );
};

export default PrivateArea;
