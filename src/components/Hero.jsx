import { motion } from "framer-motion";

import { styles } from "../styles";
import { ComputersCanvas } from "./canvas";

import { useTranslation } from "react-i18next";

const Hero = () => {
  const { t } = useTranslation("global");

  return (
    <section className="relative w-full h-screen mx-auto">
      <div
        className={`${styles.paddingX} absolute inset-0 top-[120px] max-w-7xl mx-auto flex flex-row items-start gap-5`}
      >
        <div className=" flex flex-col justify-center items-center mt-5">
          <div className="w-5 h-5 rounded-full bg-[#5ed1ff]" />
          <div className="w-1 sm:h-80 h-40 bg-gradient-to-b from-[#5ed1ff]" />
        </div>
        <div>
          <h1 className={`${styles.heroHeadText} text-white`}>
            {t("Hero.Iam")}
            <span className="text-[#5ed1ff]">Marius</span>
          </h1>
          <p className={`${styles.heroSubText} mt-2 text-white-100`}>
            {t("Hero.Description1")} <br className="sm:block hidden"></br>
            {t("Hero.Description2")}
          </p>
        </div>
      </div>

      <ComputersCanvas />

      <div className="absolute xs:bottom-10 bottom-32 w-full flex justify-center">
        <a href="#About">
          <div className="w-[35px] h-[64px] rounded-3xl border-4 border-secondary flex justify-center items-start">
            <motion.div
              animate={{ y: [0, 24, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop",
              }}
              className="w-3 h-3 rounded-full bg-secondary mb-1"
            />
          </div>
        </a>
      </div>
    </section>
  );
};

export default Hero;
