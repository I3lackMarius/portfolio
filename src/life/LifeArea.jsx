import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import i18next from "i18next";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import { LifeProvider, useLife } from "./LifeProvider.jsx";
import "./life.css";

const messages = {
  it: {
    title: "Area privata",
    subtitle: "Il tuo spazio personale",
    loading: "Caricamento degli spazi di lavoro...",
    noWorkspaces: "Il tuo spazio personale non è ancora disponibile.",
    askAdmin: "Contatta l'amministratore se il problema persiste.",
    choose: "Seleziona uno spazio di lavoro",
    workspace: "Spazio di lavoro",
    owner: "Proprietario",
    member: "Membro",
    modules: "Moduli",
    available: "Disponibile",
    notImplemented: "Entitlement attivo; modulo non ancora implementato",
    notIncluded: "Non incluso",
    retry: "Riprova",
    logout: "Esci",
    home: "Torna al portfolio",
    light: "Tema chiaro",
    dark: "Tema scuro",
    loadingContext: "Verifica dello spazio...",
    unavailable: "Non disponibile",
    logoutError: "Non è stato possibile completare la disconnessione.",
    workspacesError: "Non è stato possibile caricare gli spazi di lavoro.",
    contextError: "Non è stato possibile verificare l'accesso allo spazio.",
  },
  en: {
    title: "Private area",
    subtitle: "Your personal workspace",
    loading: "Loading workspaces...",
    noWorkspaces: "Your personal workspace is not available yet.",
    askAdmin: "Contact the administrator if this continues.",
    choose: "Select a workspace",
    workspace: "Workspace",
    owner: "Owner",
    member: "Member",
    modules: "Modules",
    available: "Available",
    notImplemented: "Entitlement active; module not implemented yet",
    notIncluded: "Not included",
    retry: "Retry",
    logout: "Log out",
    home: "Back to portfolio",
    light: "Light theme",
    dark: "Dark theme",
    loadingContext: "Verifying workspace...",
    unavailable: "Unavailable",
    logoutError: "Unable to complete sign out.",
    workspacesError: "Unable to load workspaces.",
    contextError: "Unable to verify workspace access.",
  },
};

const LifeAreaContent = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const {
    workspaces,
    selectedTenantId,
    selectTenant,
    context,
    workspacesLoading,
    contextLoading,
    error,
    retry,
  } = useLife();
  const navigate = useNavigate();
  const [theme, setTheme] = useState("light");
  const [logoutError, setLogoutError] = useState(false);
  const language = i18next.language?.startsWith("it") ? "it" : "en";
  const text = messages[language];

  useEffect(() => {
    document.body.classList.add("life-active");
    return () => document.body.classList.remove("life-active");
  }, []);

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate("/");
    } else {
      setLogoutError(true);
    }
  };

  const selectedWorkspace = workspaces.find(
    (workspace) => workspace.id === selectedTenantId,
  );

  return (
    <main className="life-shell" data-theme={theme}>
      <div className="life-container">
        <header className="life-header">
          <div className="life-brand">
            <span className="life-brand-mark" aria-hidden="true">
              L
            </span>
            <div>
              <p className="life-eyebrow">Life2.0</p>
              <h1>{text.title}</h1>
            </div>
          </div>
          <button
            className="life-button life-button-secondary"
            type="button"
            onClick={() =>
              setTheme((current) => (current === "light" ? "dark" : "light"))
            }
            aria-label={theme === "light" ? text.dark : text.light}
          >
            {theme === "light" ? text.dark : text.light}
          </button>
        </header>

        <section className="life-welcome">
          <div>
            <p className="life-eyebrow">{text.subtitle}</p>
            <h2>{user?.name}</h2>
          </div>
          {selectedWorkspace && (
            <span className="life-role">
              {selectedWorkspace.role === "owner" ? text.owner : text.member}
            </span>
          )}
        </section>

        {workspaces.length > 1 && (
          <label className="life-field">
            <span>{text.choose}</span>
            <select
              value={selectedTenantId}
              onChange={(event) => selectTenant(event.target.value)}
            >
              <option value="">{text.choose}</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {(workspacesLoading || authLoading) && (
          <p className="life-notice" role="status">
            {text.loading}
          </p>
        )}

        {!workspacesLoading && !error && workspaces.length === 0 && (
          <section className="life-card life-empty" role="status">
            <h3>{text.noWorkspaces}</h3>
            <p>{text.askAdmin}</p>
          </section>
        )}

        {!workspacesLoading &&
          !error &&
          workspaces.length > 1 &&
          !selectedTenantId && (
            <p className="life-notice" role="status">
              {text.choose}
            </p>
          )}

        {contextLoading && (
          <p className="life-notice" role="status">
            {text.loadingContext}
          </p>
        )}

        {error && (
          <section className="life-card life-error" role="alert">
            <p>
              {error === "workspaces_load_failed"
                ? text.workspacesError
                : text.contextError}
            </p>
            <button
              className="life-button life-button-primary"
              type="button"
              onClick={retry}
            >
              {text.retry}
            </button>
          </section>
        )}

        {context && (
          <section className="life-section">
            <div className="life-section-heading">
              <div>
                <p className="life-eyebrow">{text.workspace}</p>
                <h3>{context.tenant.name}</h3>
              </div>
              <span className="life-count">
                {context.modules.length} {text.modules.toLowerCase()}
              </span>
            </div>
            <div className="life-module-grid">
              {context.modules.map((module) => (
                <article className="life-card" key={module.key}>
                  <div className="life-module-heading">
                    <h4>{module.name}</h4>
                    <span
                      className={
                        module.available
                          ? "life-status life-status-available"
                          : "life-status"
                      }
                    >
                      {module.available
                        ? text.available
                        : module.entitled
                          ? text.notImplemented
                          : text.notIncluded}
                    </span>
                  </div>
                  {!module.implemented && (
                    <p className="life-muted">{text.unavailable}</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {logoutError && (
          <p className="life-inline-error" role="alert">
            {text.logoutError}
          </p>
        )}

        <footer className="life-footer">
          <Link className="life-link" to="/">
            {text.home}
          </Link>
          <button
            className="life-button life-button-secondary"
            type="button"
            disabled={authLoading}
            onClick={handleLogout}
          >
            {text.logout}
          </button>
        </footer>
      </div>
    </main>
  );
};

const LifeArea = () => (
  <LifeProvider>
    <LifeAreaContent />
  </LifeProvider>
);

export default LifeArea;
