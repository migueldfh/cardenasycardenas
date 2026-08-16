export interface ThemeColorPalette {
  primary: string; // Space-separated HSL values, e.g. "220 85% 50%"
  primaryForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

export interface ClientTheme {
  name: string;
  light: ThemeColorPalette;
  dark: ThemeColorPalette;
}

export const CLIENT_THEMES: Record<string, ClientTheme> = {
  cardenas: {
    name: "Cárdenas y Cárdenas (Blue)",
    light: {
      primary: "220.1 85.1% 50%",
      primaryForeground: "0 0% 100%",
      background: "210 40% 98%",
      foreground: "222.2 84% 4.9%",
      card: "0 0% 100%",
      cardForeground: "222.2 84% 4.9%",
      popover: "0 0% 100%",
      popoverForeground: "222.2 84% 4.9%",
      secondary: "210 40% 96.1%",
      secondaryForeground: "222.2 47.4% 11.2%",
      muted: "210 40% 96.1%",
      mutedForeground: "215.4 16.3% 46.9%",
      accent: "210 40% 96.1%",
      accentForeground: "222.2 47.4% 11.2%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "210 40% 98%",
      border: "214.3 31.8% 91.4%",
      input: "214.3 31.8% 91.4%",
      ring: "220.1 85.1% 50%",
    },
    dark: {
      primary: "217.2 91.2% 59.8%",
      primaryForeground: "222.2 84% 4.9%",
      background: "222.2 84% 4.9%",
      foreground: "210 40% 98%",
      card: "222.2 84% 7%",
      cardForeground: "210 40% 98%",
      popover: "222.2 84% 4.9%",
      popoverForeground: "210 40% 98%",
      secondary: "217.2 32.6% 17.5%",
      secondaryForeground: "210 40% 98%",
      muted: "217.2 32.6% 17.5%",
      mutedForeground: "215 20.2% 65.1%",
      accent: "217.2 32.6% 17.5%",
      accentForeground: "210 40% 98%",
      destructive: "0 62.8% 30.6%",
      destructiveForeground: "210 40% 98%",
      border: "217.2 32.6% 25%",
      input: "217.2 32.6% 17.5%",
      ring: "217.2 91.2% 59.8%",
    }
  },
  decreto: {
    name: "Blue",
    light: {
      primary: "220.1 85.1% 50%", // Blue
      primaryForeground: "0 0% 100%",
      background: "210 40% 98%", // Soft light greyish blue bg
      foreground: "222.2 84% 4.9%",
      card: "0 0% 100%",
      cardForeground: "222.2 84% 4.9%",
      popover: "0 0% 100%",
      popoverForeground: "222.2 84% 4.9%",
      secondary: "210 40% 96.1%",
      secondaryForeground: "222.2 47.4% 11.2%",
      muted: "210 40% 96.1%",
      mutedForeground: "215.4 16.3% 46.9%",
      accent: "210 40% 96.1%",
      accentForeground: "222.2 47.4% 11.2%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "210 40% 98%",
      border: "214.3 31.8% 91.4%",
      input: "214.3 31.8% 91.4%",
      ring: "220.1 85.1% 50%",
    },
    dark: {
      primary: "217.2 91.2% 59.8%", // Bright Blue
      primaryForeground: "222.2 84% 4.9%",
      background: "222.2 84% 4.9%", // Deep dark background
      foreground: "210 40% 98%",
      card: "222.2 84% 7%", // Card slightly lighter than background
      cardForeground: "210 40% 98%",
      popover: "222.2 84% 4.9%",
      popoverForeground: "210 40% 98%",
      secondary: "217.2 32.6% 17.5%",
      secondaryForeground: "210 40% 98%",
      muted: "217.2 32.6% 17.5%",
      mutedForeground: "215 20.2% 65.1%",
      accent: "217.2 32.6% 17.5%",
      accentForeground: "210 40% 98%",
      destructive: "0 62.8% 30.6%",
      destructiveForeground: "210 40% 98%",
      border: "217.2 32.6% 25%", // High contrast borders
      input: "217.2 32.6% 17.5%",
      ring: "217.2 91.2% 59.8%",
    }
  },
  grafinsa: {
    name: "Teal/Green",
    light: {
      primary: "162.2 93.5% 30.4%", // Teal-Green branding
      primaryForeground: "0 0% 100%",
      background: "162.2 20% 98%", // Very soft green tint bg
      foreground: "222.2 84% 4.9%",
      card: "0 0% 100%",
      cardForeground: "222.2 84% 4.9%",
      popover: "0 0% 100%",
      popoverForeground: "222.2 84% 4.9%",
      secondary: "162.2 30% 96.1%",
      secondaryForeground: "162.2 93.5% 20%",
      muted: "162.2 10% 96.1%",
      mutedForeground: "215.4 16.3% 46.9%",
      accent: "162.2 30% 96.1%",
      accentForeground: "162.2 93.5% 20%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "210 40% 98%",
      border: "162.2 20% 90%",
      input: "162.2 20% 90%",
      ring: "162.2 93.5% 30.4%",
    },
    dark: {
      primary: "162.2 93.5% 40%", // Lighter green for readability in dark mode
      primaryForeground: "0 0% 100%",
      background: "162.2 50% 6%", // Extremely dark forest green/black
      foreground: "162.2 10% 98%",
      card: "162.2 30% 10%",
      cardForeground: "162.2 10% 98%",
      popover: "162.2 50% 6%",
      popoverForeground: "162.2 10% 98%",
      secondary: "162.2 30% 17.5%",
      secondaryForeground: "210 40% 98%",
      muted: "162.2 20% 17.5%",
      mutedForeground: "215 20.2% 65.1%",
      accent: "162.2 30% 17.5%",
      accentForeground: "210 40% 98%",
      destructive: "0 62.8% 30.6%",
      destructiveForeground: "210 40% 98%",
      border: "162.2 20% 20%",
      input: "162.2 20% 17.5%",
      ring: "162.2 93.5% 40%",
    }
  },
  sunset: {
    name: "Sunset Orange",
    light: {
      primary: "24.6 95% 53.1%", // Orange
      primaryForeground: "0 0% 100%",
      background: "24.6 20% 98%",
      foreground: "222.2 84% 4.9%",
      card: "0 0% 100%",
      cardForeground: "222.2 84% 4.9%",
      popover: "0 0% 100%",
      popoverForeground: "222.2 84% 4.9%",
      secondary: "24.6 20% 96.1%",
      secondaryForeground: "24.6 95% 20%",
      muted: "24.6 10% 96.1%",
      mutedForeground: "215.4 16.3% 46.9%",
      accent: "24.6 20% 96.1%",
      accentForeground: "24.6 95% 20%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "210 40% 98%",
      border: "24.6 20% 90%",
      input: "24.6 20% 90%",
      ring: "24.6 95% 53.1%",
    },
    dark: {
      primary: "24.6 95% 53.1%",
      primaryForeground: "0 0% 100%",
      background: "24.6 40% 6%",
      foreground: "24.6 10% 98%",
      card: "24.6 30% 10%",
      cardForeground: "24.6 10% 98%",
      popover: "24.6 40% 6%",
      popoverForeground: "24.6 10% 98%",
      secondary: "24.6 30% 17.5%",
      secondaryForeground: "210 40% 98%",
      muted: "24.6 20% 17.5%",
      mutedForeground: "215 20.2% 65.1%",
      accent: "24.6 30% 17.5%",
      accentForeground: "210 40% 98%",
      destructive: "0 62.8% 30.6%",
      destructiveForeground: "210 40% 98%",
      border: "24.6 20% 20%",
      input: "24.6 20% 17.5%",
      ring: "24.6 95% 53.1%",
    }
  },
  purple: {
    name: "Deep Purple",
    light: {
      primary: "262.1 83.3% 57.8%", // Purple
      primaryForeground: "0 0% 100%",
      background: "262.1 20% 98%",
      foreground: "222.2 84% 4.9%",
      card: "0 0% 100%",
      cardForeground: "222.2 84% 4.9%",
      popover: "0 0% 100%",
      popoverForeground: "222.2 84% 4.9%",
      secondary: "262.1 20% 96.1%",
      secondaryForeground: "262.1 83.3% 20%",
      muted: "262.1 10% 96.1%",
      mutedForeground: "215.4 16.3% 46.9%",
      accent: "262.1 20% 96.1%",
      accentForeground: "262.1 83.3% 20%",
      destructive: "0 84.2% 60.2%",
      destructiveForeground: "210 40% 98%",
      border: "262.1 20% 90%",
      input: "262.1 20% 90%",
      ring: "262.1 83.3% 57.8%",
    },
    dark: {
      primary: "262.1 83.3% 57.8%",
      primaryForeground: "0 0% 100%",
      background: "262.1 40% 6%",
      foreground: "262.1 10% 98%",
      card: "262.1 30% 10%",
      cardForeground: "262.1 10% 98%",
      popover: "262.1 40% 6%",
      popoverForeground: "262.1 10% 98%",
      secondary: "262.1 30% 17.5%",
      secondaryForeground: "210 40% 98%",
      muted: "262.1 20% 17.5%",
      mutedForeground: "215 20.2% 65.1%",
      accent: "262.1 30% 17.5%",
      accentForeground: "210 40% 98%",
      destructive: "0 62.8% 30.6%",
      destructiveForeground: "210 40% 98%",
      border: "262.1 20% 20%",
      input: "262.1 20% 17.5%",
      ring: "262.1 83.3% 57.8%",
    }
  }
};

export const DEFAULT_CLIENT_THEME = "cardenas";
