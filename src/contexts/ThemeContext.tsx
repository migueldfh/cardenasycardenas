import React, { createContext, useContext, useEffect, useState } from "react";
import { CLIENT_THEMES, DEFAULT_CLIENT_THEME, type ThemeColorPalette } from "../config/themes";
import { supabase } from "@/lib/supabase";

export type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  palette: string;
  setPalette: (palette: string) => void;
  customColors: Record<string, string>; // Hex format
  updateCustomColor: (colorKey: keyof ThemeColorPalette, hexValue: string) => void;
  resetToDefaults: () => void;
  logoUrl: string | null;
  updateLogoUrl: (url: string | null) => void;
  loginImageUrl: string | null;
  updateLoginImageUrl: (url: string | null) => void;
  saveCorporateBranding: (
    palette: string,
    mode: ThemeMode,
    customColors: Record<string, string>,
    logoUrl: string | null,
    loginImageUrl: string | null
  ) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to convert Hex to HSL space-separated values for Tailwind
export function hexToHsl(hex: string): string {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) return "0 0% 100%";

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Helper to convert space-separated HSL values back to Hex
export function hslToHex(hslStr: string): string {
  const parts = hslStr.trim().split(/\s+/);
  if (parts.length < 3) return "#ffffff";

  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1].replace("%", "")) / 100;
  const l = parseFloat(parts[2].replace("%", "")) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const rHex = Math.round((r + m) * 255).toString(16).padStart(2, "0");
  const gHex = Math.round((g + m) * 255).toString(16).padStart(2, "0");
  const bHex = Math.round((b + m) * 255).toString(16).padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("theme-mode");
    return (saved as ThemeMode) || "light";
  });

  const [palette, setPaletteState] = useState<string>(() => {
    const saved = localStorage.getItem("theme-palette");
    return saved || DEFAULT_CLIENT_THEME;
  });

  const [customColors, setCustomColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem("theme-custom-colors");
    return saved ? JSON.parse(saved) : {};
  });

  const [logoUrl, setLogoUrlState] = useState<string | null>(() => {
    return localStorage.getItem("theme-logo-url");
  });

  const [loginImageUrl, setLoginImageUrlState] = useState<string | null>(() => {
    return localStorage.getItem("theme-login-image-url");
  });

  // Load settings from database on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("theme_palette, theme_mode, custom_colors, other_settings")
          .eq("id", "global")
          .single();

        if (error) {
          if (error.code !== "PGRST116") throw error; // Ignore if row doesn't exist
        } else if (data) {
          if (data.theme_mode) {
            setModeState(data.theme_mode as ThemeMode);
            localStorage.setItem("theme-mode", data.theme_mode);
          }
          if (data.theme_palette) {
            setPaletteState(data.theme_palette);
            localStorage.setItem("theme-palette", data.theme_palette);
          }
          if (data.custom_colors) {
            setCustomColors(data.custom_colors);
            localStorage.setItem("theme-custom-colors", JSON.stringify(data.custom_colors));
          }
          const logo = data.other_settings?.logo_url || null;
          setLogoUrlState(logo);
          if (logo) {
            localStorage.setItem("theme-logo-url", logo);
          } else {
            localStorage.removeItem("theme-logo-url");
          }
          const loginImg = data.other_settings?.login_image_url || null;
          setLoginImageUrlState(loginImg);
          if (loginImg) {
            localStorage.setItem("theme-login-image-url", loginImg);
          } else {
            localStorage.removeItem("theme-login-image-url");
          }
        }
      } catch (err) {
        console.error("Error loading branding from Supabase:", err);
      }
    }
    loadSettings();
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem("theme-mode", newMode);
  };

  const setPalette = (newPalette: string) => {
    setPaletteState(newPalette);
    localStorage.setItem("theme-palette", newPalette);
  };

  const updateCustomColor = (colorKey: keyof ThemeColorPalette, hexValue: string) => {
    setCustomColors((prev) => {
      const updated = { ...prev, [colorKey]: hexValue };
      localStorage.setItem("theme-custom-colors", JSON.stringify(updated));
      return updated;
    });
    setPalette("custom");
  };

  const resetToDefaults = () => {
    setCustomColors({});
    localStorage.removeItem("theme-custom-colors");
    setPalette(DEFAULT_CLIENT_THEME);
    setMode("light");
    setLogoUrlState(null);
    localStorage.removeItem("theme-logo-url");
    setLoginImageUrlState(null);
    localStorage.removeItem("theme-login-image-url");
  };

  const updateLogoUrl = (url: string | null) => {
    setLogoUrlState(url);
    if (url) {
      localStorage.setItem("theme-logo-url", url);
    } else {
      localStorage.removeItem("theme-logo-url");
    }
  };

  const updateLoginImageUrl = (url: string | null) => {
    setLoginImageUrlState(url);
    if (url) {
      localStorage.setItem("theme-login-image-url", url);
    } else {
      localStorage.removeItem("theme-login-image-url");
    }
  };

  const saveCorporateBranding = async (
    targetPalette: string,
    targetMode: ThemeMode,
    targetCustomColors: Record<string, string>,
    targetLogoUrl: string | null,
    targetLoginImageUrl: string | null
  ) => {
    const { data: current, error: fetchErr } = await supabase
      .from("app_settings")
      .select("other_settings")
      .eq("id", "global")
      .single();

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      throw fetchErr;
    }

    const updatedOtherSettings = {
      ...(current?.other_settings || {}),
      logo_url: targetLogoUrl,
      login_image_url: targetLoginImageUrl,
    };

    const { error } = await supabase
      .from("app_settings")
      .upsert({
        id: "global",
        theme_palette: targetPalette,
        theme_mode: targetMode,
        custom_colors: targetCustomColors,
        other_settings: updatedOtherSettings,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    // Apply saved settings locally
    setModeState(targetMode);
    localStorage.setItem("theme-mode", targetMode);
    setPaletteState(targetPalette);
    localStorage.setItem("theme-palette", targetPalette);
    setCustomColors(targetCustomColors);
    localStorage.setItem("theme-custom-colors", JSON.stringify(targetCustomColors));
    updateLogoUrl(targetLogoUrl);
    updateLoginImageUrl(targetLoginImageUrl);
  };

  // Effect to apply styles to document element
  useEffect(() => {
    const root = document.documentElement;

    // 1. Handle Dark class toggle
    if (mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // 2. Resolve colors to HSL
    let basePalette = CLIENT_THEMES[palette] || CLIENT_THEMES[DEFAULT_CLIENT_THEME];
    
    // Fallback/base values for the current mode
    const currentBaseColors = basePalette[mode];

    // Build finalized colors object
    const finalColors: Record<string, string> = {};

    // First copy all base colors
    Object.entries(currentBaseColors).forEach(([key, val]) => {
      finalColors[key] = val;
    });

    // If palette is "custom", override with custom colors converted to HSL format
    if (palette === "custom") {
      Object.entries(customColors).forEach(([key, hexVal]) => {
        if (hexVal) {
          finalColors[key] = hexToHsl(hexVal);
        }
      });
    }

    // 3. Apply properties
    Object.entries(finalColors).forEach(([key, val]) => {
      const cssKey = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
      root.style.setProperty(cssKey, val);
    });
  }, [mode, palette, customColors]);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        palette,
        setPalette,
        customColors,
        updateCustomColor,
        resetToDefaults,
        logoUrl,
        updateLogoUrl,
        loginImageUrl,
        updateLoginImageUrl,
        saveCorporateBranding,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
