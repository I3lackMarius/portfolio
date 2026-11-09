import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { styles } from "../styles";
import menu from "/assets/menu.svg";
import close from "/assets/close.svg";
import personal from "/assets/ProfilePic.jpg";

import { useTranslation } from "react-i18next";

const Navbar = () => {
  const [active, setActive] = useState("");
  const [toggle, setToggle] = useState(false);
  const { t, i18n } = useTranslation("global");
  const [language, setLanguage] = useState("gb");

  const toggleLanguage = () => {
    const newLanguage = language === "gb" ? "it" : "gb";
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
  };

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
        <ul className="list-none hidden sm:flex flex-row gap-5">
          {Object.entries(t("Navbar.navLinks", { returnObjects: true })).map(
            ([key, value]) => (
              <li
                key={key}
                className={`${
                  active === value ? "text-white" : "text-secondary"
                } hover:text-white text-[18px] font-medium cursor-pointer`}
                onClick={() => setActive(value)}
              >
                <a href={`#${key}`}>{value}</a>
              </li>
            )
          )}
        </ul>
        <div className="sm:hidden flex flex-1 justify-end items-center">
          <img
            src={toggle ? close : menu}
            alt="menu"
            className="w-[28px] h-[28px] object-contain cursor-pointer"
            onClick={() => setToggle(!toggle)}
          />
          <div
            className={`${
              !toggle ? "hidden" : "flex"
            } p-6 black-gradient absolute top-20 right-0 mx-2 my-2 min-w-[140px] z-10 rounded-xl`}
          >
            <ul className="list-none flex sm:flex justify-end items-start flex-col gap-4">
              {Object.entries(
                t("Navbar.navLinks", { returnObjects: true })
              ).map(([key, value]) => (
                <li
                  key={key}
                  className={`${
                    active === value ? "text-white" : "text-secondary"
                  } font-poppins font-medium cursor-pointer text-[16px]`}
                  onClick={() => {
                    setToggle(!toggle);
                    setActive(value);
                  }}
                >
                  <a href={`#${key}`}>{value}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <button
          onClick={toggleLanguage}
          className="rounded-full p-1 bg-blue-300 focus:outline-none mx-2 "
        >
          <img
            src={`https://flagsapi.com/${language.toUpperCase()}/flat/24.png`}
            alt="Language flag"
            className="w-6 h-6"
          />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
