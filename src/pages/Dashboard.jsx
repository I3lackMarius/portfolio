import React from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <div className="pt-20 min-h-screen flex items-center justify-center bg-primary text-white p-6">
        <div className="max-w-3xl w-full bg-[#071e22] rounded-lg p-8 shadow-md">
          <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
          <p className="mb-2">Benvenuto, {user?.username}!</p>
          <p className="text-sm text-secondary">Role: {user?.role}</p>

          <div className="mt-6">
            <p>
              Qui potrai aggiungere le funzionalità della tua web app: widgets,
              strumenti, impostazioni e altro. Questo è solo un punto di
              partenza.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
