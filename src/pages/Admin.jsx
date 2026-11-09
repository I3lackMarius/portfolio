import React from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const Admin = () => {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <div className="pt-20 min-h-screen flex items-center justify-center bg-primary text-white p-6">
        <div className="max-w-3xl w-full bg-[#071e22] rounded-lg p-8 shadow-md">
          <h1 className="text-2xl font-bold mb-4">Admin Area</h1>
          <p className="mb-2">Benvenuto admin: {user?.username}</p>

          <div className="mt-6 text-sm text-secondary">
            <p>
              Questa pagina è accessibile solo agli utenti con ruolo{" "}
              <strong>admin</strong>.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Admin;
