import { useEffect, useState } from "react";

export interface AccentColors {
  accent: string;
  accent2: string;
  accentWarm: string;
}

const DEFAULT_LIGHT: AccentColors = { accent: "#0d9488", accent2: "#7c3aed", accentWarm: "#ea8a3d" };
const DEFAULT_DARK: AccentColors = { accent: "#7dd3c0", accent2: "#a78bfa", accentWarm: "#f4a261" };

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("planner_theme") as "light" | "dark") || "dark"
  );
  const [accents, setAccents] = useState<AccentColors>(() => {
    const stored = localStorage.getItem("planner_accents_" + theme);
    return stored ? JSON.parse(stored) : (theme === "dark" ? DEFAULT_DARK : DEFAULT_LIGHT);
  });
  const [bgImage, setBgImageState] = useState<string | null>(() => localStorage.getItem("planner_bg_image"));
  const [bgOpacity, setBgOpacityState] = useState<number>(() => {
    const v = localStorage.getItem("planner_bg_opacity");
    return v ? parseFloat(v) : 0.65;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("planner_theme", theme);
    const stored = localStorage.getItem("planner_accents_" + theme);
    const a = stored ? JSON.parse(stored) : (theme === "dark" ? DEFAULT_DARK : DEFAULT_LIGHT);
    setAccents(a);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accents.accent);
    document.documentElement.style.setProperty("--accent2", accents.accent2);
    document.documentElement.style.setProperty("--accent-warm", accents.accentWarm);
    localStorage.setItem("planner_accents_" + theme, JSON.stringify(accents));
  }, [accents, theme]);

  useEffect(() => {
    if (bgImage) {
      document.documentElement.style.setProperty("--user-bg-image", `url(${bgImage})`);
      document.body.classList.add("has-user-bg");
    } else {
      document.documentElement.style.removeProperty("--user-bg-image");
      document.body.classList.remove("has-user-bg");
    }
  }, [bgImage]);

  useEffect(() => {
    document.documentElement.style.setProperty("--user-bg-opacity", String(bgOpacity));
  }, [bgOpacity]);

  function setBgImage(dataUrl: string | null) {
    setBgImageState(dataUrl);
    if (dataUrl) localStorage.setItem("planner_bg_image", dataUrl);
    else localStorage.removeItem("planner_bg_image");
  }

  function setBgOpacity(v: number) {
    setBgOpacityState(v);
    localStorage.setItem("planner_bg_opacity", String(v));
  }

  return { theme, setTheme, accents, setAccents, bgImage, setBgImage, bgOpacity, setBgOpacity };
}
