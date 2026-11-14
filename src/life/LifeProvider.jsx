import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api.js";

const LifeContext = createContext(undefined);

export const useLife = () => {
  const context = useContext(LifeContext);
  if (!context) {
    throw new Error("useLife must be used within a LifeProvider");
  }
  return context;
};

export const LifeProvider = ({ children }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [context, setContext] = useState(null);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [contextLoading, setContextLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [contextReloadKey, setContextReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    setWorkspacesLoading(true);
    setError("");
    api
      .get("/life/v1/workspaces")
      .then(({ data }) => {
        if (!Array.isArray(data.workspaces)) {
          throw new Error("The Life API returned an invalid workspace list");
        }
        if (!active) return;

        setWorkspaces(data.workspaces);
        setSelectedTenantId((currentTenantId) => {
          if (
            currentTenantId &&
            data.workspaces.some(
              (workspace) => workspace.id === currentTenantId,
            )
          ) {
            return currentTenantId;
          }
          return data.workspaces.length === 1 ? data.workspaces[0].id : "";
        });
      })
      .catch(() => {
        if (active) {
          setError("workspaces_load_failed");
        }
      })
      .finally(() => {
        if (active) setWorkspacesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;
    setContext(null);
    setError("");

    if (!selectedTenantId) {
      setContextLoading(false);
      return () => {
        active = false;
      };
    }

    setContextLoading(true);
    api
      .get("/life/v1/context", { params: { tenantId: selectedTenantId } })
      .then(({ data }) => {
        if (active) setContext(data);
      })
      .catch(() => {
        if (active) {
          setError("context_load_failed");
        }
      })
      .finally(() => {
        if (active) setContextLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedTenantId, contextReloadKey]);

  const retry = () => {
    setReloadKey((current) => current + 1);
    setContextReloadKey((current) => current + 1);
  };

  return (
    <LifeContext.Provider
      value={{
        workspaces,
        selectedTenantId,
        selectTenant: setSelectedTenantId,
        context,
        workspacesLoading,
        contextLoading,
        error,
        retry,
      }}
    >
      {children}
    </LifeContext.Provider>
  );
};
