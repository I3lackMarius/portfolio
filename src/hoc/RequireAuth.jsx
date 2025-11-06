import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RequireAuth = ({ children, requiredRole }) => {
  const { user } = useAuth();

  if (!user) {
    // not authenticated -> send back to landing (could open login modal there)
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    // unauthorized for role
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RequireAuth;
