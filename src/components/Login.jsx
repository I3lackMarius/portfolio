import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const LoginModal = ({ show, onClose }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("user");

  if (!show) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!username) return;
    login({ username, role });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-[#0b2730] rounded-lg p-6 w-full max-w-sm shadow-lg">
        <h3 className="text-white text-lg font-bold mb-4">Login</h3>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            className="p-2 rounded bg-[#062022] text-white border border-slate-700"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="p-2 rounded bg-[#062022] text-white border border-slate-700"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded bg-slate-600 text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded bg-blue-500 text-white"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
