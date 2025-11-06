import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { styles } from "../styles";
// menu icons removed (using text icon)
import personal from "/assets/ProfilePic.jpg";

import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import LoginModal from "./Login";
import RightSidebar from "./RightSidebar";

const Navbar = () => {
  const [active, setActive] = useState("");
  const { t } = useTranslation("global");
  const { user, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileLandingOpen, setMobileLandingOpen] = useState(false);
  const mobileLandingRef = useRef(null);
  const location = useLocation();

  // language toggle moved to sidebar

  // close mobile landing dropdown when clicking outside or on route change
  useEffect(() => {
    const onDocClick = (e) => {
      if (
        mobileLandingOpen &&
        mobileLandingRef.current &&
        !mobileLandingRef.current.contains(e.target)
      ) {
        setMobileLandingOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [mobileLandingOpen]);

  useEffect(() => {
    // close mobile landing when route changes
    setMobileLandingOpen(false);
  }, [location.pathname]);

  return (
    <nav
      className={`${styles.paddingX} w-full flex items-center py-5 fixed top-0 z-20 bg-gradient-to-b from-[#132932] `}
    >
      <div className="w-full flex justify-between items-center max-w-7xl mx-auto">
        <Link
          to="/"
          className="flex items-center gap-2"
          onClick={() => {
            setActive("");
            window.scrollTo(0, 0);
          }}
        >
          <img
            src={personal}
            alt="personal"
            className="w-14 h-14 object-cover rounded-full"
          />
          <p className="text-white text-[18px] font-bold cursor-pointer flex">
            <span className="sm:block hidden">{t("Navbar.Iam")}</span>
          </p>
        </Link>
        {/* Center area */}
        <div className="flex-1 flex items-center justify-center">
          {location.pathname === "/" ? (
            // on landing show landing links (desktop) or mobile button
            <>
              <ul className="list-none hidden sm:flex flex-row gap-5 items-center">
                {(() => {
                  const navObj = t("Navbar.navLinks", { returnObjects: true });
                  let entries = Object.entries(navObj);
                  if (!user) {
                    entries = entries.filter(([key]) =>
                      ["About", "Contact"].includes(key)
                    );
                  } else if (user.role === "user") {
                    entries = entries.filter(([key]) =>
                      ["About", "Experience", "Contact"].includes(key)
                    );
                  }
                  return entries.map(([key, value]) => (
                    <li
                      key={key}
                      className={`${
                        active === value ? "text-white" : "text-secondary"
                      } hover:text-white text-[18px] font-medium cursor-pointer`}
                      onClick={() => setActive(value)}
                    >
                      <a href={`#${key}`}>{value}</a>
                    </li>
                  ));
                })()}
              </ul>

              {/* mobile: show a button that opens small landing links */}
              <div className="sm:hidden relative" ref={mobileLandingRef}>
                <button
                  aria-expanded={mobileLandingOpen}
                  aria-controls="mobile-landing"
                  onClick={() => setMobileLandingOpen((s) => !s)}
                  className="px-3 py-1 rounded bg-slate-700 text-white"
                >
                  Home
                </button>
                {mobileLandingOpen && (
                  <div
                    id="mobile-landing"
                    className="absolute left-1/2 -translate-x-1/2 mt-2 w-40 bg-[#071e22] rounded shadow-lg p-2 z-20"
                  >
                    <ul className="flex flex-col gap-2">
                      {Object.entries(
                        t("Navbar.navLinks", { returnObjects: true })
                      ).map(([key, value]) => (
                        <li key={key}>
                          <a
                            className="block px-2 py-1 text-secondary hover:text-white"
                            href={`#${key}`}
                            onClick={() => setMobileLandingOpen(false)}
                          >
                            {value}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-white text-lg font-semibold">
              {location.pathname === "/app" && "Dashboard"}
              {location.pathname === "/profile" && "Profile"}
              {location.pathname === "/admin" && "Admin"}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* hamburger: opens right sidebar (overlay) */}
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            aria-expanded={sidebarOpen}
            aria-controls="right-sidebar"
            aria-label="Open app sidebar"
            className="px-3 py-1 rounded bg-slate-700 text-white"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M3 6h18M3 12h18M3 18h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        <LoginModal show={showLogin} onClose={() => setShowLogin(false)} />
        <RightSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onRequestLogin={() => setShowLogin(true)}
        />
      </div>
    </nav>
  );
};

export default Navbar;
