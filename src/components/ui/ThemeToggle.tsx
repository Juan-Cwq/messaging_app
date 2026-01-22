import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";

type Theme = "light" | "dark";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("haven-theme") as Theme;
      if (stored) return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    localStorage.setItem("haven-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <motion.button
      onClick={toggleTheme}
      className="btn btn-ghost btn-circle"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <motion.div
        initial={false}
        animate={{ rotate: theme === "dark" ? 0 : 180 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {theme === "dark" ? (
          <MoonIcon className="h-5 w-5" />
        ) : (
          <SunIcon className="h-5 w-5" />
        )}
      </motion.div>
    </motion.button>
  );
};

export default ThemeToggle;
