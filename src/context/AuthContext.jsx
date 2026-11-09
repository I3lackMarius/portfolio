import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const AUTH_KEY = "pp_auth";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch (e) {
      console.error("Failed to parse auth from localStorage", e);
    }
  }, []);

  const login = ({ username, role = "user" }) => {
    const u = { username, role };
    setUser(u);
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    } catch (e) {
      console.error("Failed to save auth to localStorage", e);
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch (e) {
      console.error("Failed to remove auth from localStorage", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export default AuthContext;
