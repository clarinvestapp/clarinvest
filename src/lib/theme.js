"use client";
import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({ mode: "dark", setMode: () => {} });

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("cv-theme");
    if (saved === "light" || saved === "dark") setModeState(saved);
  }, []);

  const setMode = (m) => {
    setModeState(m);
    localStorage.setItem("cv-theme", m);
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
