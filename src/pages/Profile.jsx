import React from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

const Profile = () => {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <div className="pt-20 min-h-screen flex items-center justify-center bg-primary text-white p-6">
        <div className="max-w-3xl w-full bg-[#071e22] rounded-lg p-8 shadow-md">
          <h1 className="text-2xl font-bold mb-4">Profile</h1>
          <p className="mb-2">Username: {user?.username}</p>
          <p className="mb-2">Role: {user?.role}</p>

          <div className="mt-6 text-sm text-secondary">
            <p>
              Questa pagina conterrà informazioni e impostazioni dell'utente.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
