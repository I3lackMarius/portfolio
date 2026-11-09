import React, { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Clock from "./Clock";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

const RightSidebar = ({ open, onClose, className = "", t, onRequestLogin }) => {
  const { user, logout } = useAuth();
  const { i18n } = useTranslation();

  const currentLang = (i18n.language || "gb").startsWith("it") ? "it" : "gb";
  const toggleLanguage = () => {
    const newLang = currentLang === "gb" ? "it" : "gb";
    i18n.changeLanguage(newLang);
    // close sidebar after language change for clearer UX
    onClose();
  };

  const previousActiveRef = useRef(null);
  const navigate = useNavigate();
  const ref = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const onClick = (e) => {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, onClose]);

  // focus trap and return focus when sidebar closes
  useEffect(() => {
    if (!open) return;
    previousActiveRef.current = document.activeElement;
    const focusable = ref.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    const focusableArr = Array.from(focusable);
    if (focusableArr.length) focusableArr[0].focus();

    const handleKey = (e) => {
      if (e.key === "Tab") {
        const first = focusableArr[0];
        const last = focusableArr[focusableArr.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKey);
    // prevent body scroll while open
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = overflow;
      if (previousActiveRef.current && previousActiveRef.current.focus)
        previousActiveRef.current.focus();
    };
  }, [open, onClose]);

  const handleNav = (path) => {
    navigate(path);
    onClose();
  };

  return (
    // overlay
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-in-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        ref={ref}
        id="right-sidebar"
        className={`absolute right-0 top-0 h-full bg-[#071e22] w-full sm:w-80 transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        } ${className}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-full flex flex-col justify-between p-4">
          <div>
            <h3 className="text-white text-lg font-bold mb-4">Menu</h3>
            <ul className="flex flex-col gap-2">
              <li>
                <button
                  onClick={() => handleNav("/")}
                  className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 text-secondary"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav("/app")}
                  className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 text-secondary"
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNav("/profile")}
                  className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 text-secondary"
                >
                  Profile
                </button>
              </li>
              {user?.role === "admin" && (
                <li>
                  <button
                    onClick={() => handleNav("/admin")}
                    className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 text-secondary"
                  >
                    Admin
                  </button>
                </li>
              )}
            </ul>
          </div>

          <div>
            {/* language toggle (placed above the separator before Impostazioni) */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-secondary text-sm">Lingua</div>
              <button
                onClick={toggleLanguage}
                className="rounded-full p-1 bg-blue-300 focus:outline-none"
                aria-label="Cambia lingua"
              >
                <img
                  src={`https://flagsapi.com/${currentLang.toUpperCase()}/flat/24.png`}
                  alt="flag"
                  className="w-6 h-6"
                />
              </button>
            </div>
            <hr className="border-slate-700 my-3" />
            <button className="w-full text-left px-3 py-2 rounded hover:bg-slate-700 text-secondary">
              Impostazioni
            </button>
            <hr className="border-slate-700 my-3" />
            <div className="flex items-center justify-between">
              <Clock className="text-white font-mono text-sm" />
            </div>
            <div className="mt-2 text-sm text-secondary">
              {user ? user.username : "Guest"}
            </div>
            <div className="mt-3">
              {user ? (
                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="w-full px-3 py-2 rounded bg-red-600 text-white"
                >
                  Logout
                </button>
              ) : (
                <button
                  onClick={() => {
                    onRequestLogin?.();
                    onClose();
                  }}
                  className="w-full px-3 py-2 rounded bg-green-600 text-white"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default RightSidebar;
