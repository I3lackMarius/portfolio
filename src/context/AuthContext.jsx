import React, { useContext, useEffect, useState } from "react";
import { api, clearCsrfToken, getCsrfToken } from "../services/api.js";

const AuthContext = React.createContext(undefined);
let bootstrapRequest;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const removeLegacyAuthentication = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem("portfolioUser");
  } catch {
    console.warn("Unable to clear legacy authentication storage");
  }
};

const bootstrapAuth = () => {
  if (!bootstrapRequest) {
    bootstrapRequest = (async () => {
      try {
        await getCsrfToken();
        const { data } = await api.get("/auth/me");
        return { user: data, error: false };
      } catch (error) {
        if (error.response?.status === 401) {
          return { user: null, error: false };
        }
        return { user: null, error: true };
      }
    })().finally(() => {
      bootstrapRequest = undefined;
    });
  }

  return bootstrapRequest;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    let active = true;
    removeLegacyAuthentication();

    bootstrapAuth().then(({ user: currentUser, error }) => {
      if (active) {
        setUser(currentUser);
        setAuthError(error);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      setUser(null);
      setAuthError(false);
    };

    window.addEventListener("auth:session-expired", handleExpiredSession);
    return () =>
      window.removeEventListener("auth:session-expired", handleExpiredSession);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      await getCsrfToken();
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      setAuthError(false);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        code: error.response?.data?.code,
        message:
          error.response?.data?.message || "Unable to log in. Please try again.",
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await getCsrfToken();
      await api.post("/auth/logout");
      setUser(null);
      setAuthError(false);
      clearCsrfToken();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message:
          error.response?.data?.message ||
          "Unable to log out. Please try again.",
      };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, authError }}
    >
      {children}
    </AuthContext.Provider>
  );
};
