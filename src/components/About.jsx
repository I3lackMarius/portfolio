import React from "react";
import { Tilt } from "react-tilt";
import { motion } from "framer-motion";

import { styles } from "../styles";
import { SectionWrapper } from "../hoc";
import { fadeIn, textVariant } from "../utils/motion";

import { useTranslation } from "react-i18next";

const ServiceCard = ({ index, title, icon }) => (
  <Tilt className="xs:w-[250px] w-full">
    <motion.div
      variants={fadeIn("right", "spring", index * 0.5, 0.75)}
      className="w-full bg-gradient-to-br from-[#5ed1ff] p-[1px] rounded-[20px] shadow-card"
    >
      <div
        options={{
          max: 45,
          scale: 1,
          speed: 450,
        }}
        className="bg-gradient-to-br from-[#132932] rounded-[20px] py-5 px-12 min-h-[280px] flex justify-evenly items-center flex-col"
      >
        <img
          src={icon}
          alt="web-development"
          className="w-16 h-16 object-contain"
        />

        <h3 className="text-white text-[20px] font-bold text-center">
          {title}
        </h3>
      </div>
    </motion.div>
  </Tilt>
);

const About = () => {
  const { t } = useTranslation("global");
  return (
    <>
      <motion.div variants={textVariant()}>
        <p className={styles.sectionSubText}>{t("About.Description1")}</p>
        <h2 className={styles.sectionHeadText}>{t("About.Title")}</h2>
      </motion.div>

      <motion.p
        variants={fadeIn("", "", 0.1, 1)}
        className="mt-4 text-secondary text-[17px] max-w-3xl leading-[30px]"
      >
        {t("About.Description2")} <br className="sm:block hidden"></br>{" "}
        <br className="sm:block hidden"></br>
        {t("About.Description3")}
      </motion.p>

      <div className="mt-20 flex flex-wrap gap-10">
        {Object.entries(t("About.services", { returnObjects: true })).map(
          (service, index) => (
            <ServiceCard
              key={`project-${index}`}
              index={index}
              {...service[1]}
            />
          )
        )}
      </div>
    </>
  );
};

export default SectionWrapper(About, "About");
