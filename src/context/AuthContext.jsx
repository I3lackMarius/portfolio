import React, { useContext, useEffect, useState } from "react";
import { api } from "../services/api.js";

const AuthContext = React.createContext(undefined);
const STORAGE_KEY = "portfolioUser";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const readStoredUser = () => {
  const storedUser = localStorage.getItem(STORAGE_KEY);
  if (!storedUser) {
    return null;
  }

  try {
    const user = JSON.parse(storedUser);
    if (typeof user.token !== "string" || !user.token) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return user;
  } catch (error) {
    console.error("Stored authentication data is invalid", error);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const storedUser = readStoredUser();

    if (!storedUser) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    api
      .get("/auth/me")
      .then(({ data }) => {
        if (active) {
          const currentUser = { ...data, token: storedUser.token };
          setUser(currentUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
        }
      })
      .catch((error) => {
        if (active) {
          setUser(null);
          localStorage.removeItem(STORAGE_KEY);
          if (error.response?.status !== 401) {
            console.error("Unable to restore the saved session", error);
          }
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
