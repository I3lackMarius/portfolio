import React, { useEffect, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");

const Clock = ({ className }) => {
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  });

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setTime(
        `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <div className={className}>{time}</div>;
};

export default Clock;
