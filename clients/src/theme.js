// color design tokens export
export const tokensDark = {
    grey: {
      0: "#ffffff", // manually adjusted
      10: "#f6f6f6", // manually adjusted
      50: "#f0f0f0", // manually adjusted
      100: "#e0e0e0",
      200: "#c2c2c2",
      300: "#a3a3a3",
      400: "#858585",
      500: "#666666",
      600: "#525252",
      700: "#3d3d3d",
      800: "#292929",
      900: "#141414",
      1000: "#000000", // manually adjusted
    },
    primary: {
      // blue
      100: "#d3d4de",
      200: "#a6a9be",
      300: "#7a7f9d",
      400: "#4d547d",
      500: "#21295c",
      600: "#191F45", // manually adjusted
      700: "#141937",
      800: "#0d1025",
      900: "#070812",
    },
    secondary: {
      // yellow
      50: "#f0f0f0", // manually adjusted
      100: "#fff6e0",
      200: "#ffedc2",
      300: "#ffe3a3",
      400: "#ffda85",
      500: "#ffd166",
      600: "#cca752",
      700: "#997d3d",
      800: "#665429",
      900: "#332a14",
    },
  };
  
  // function that reverses the color palette
  function reverseTokens(tokensDark) {
    const reversedTokens = {};
    Object.entries(tokensDark).forEach(([key, val]) => {
      const keys = Object.keys(val);
      const values = Object.values(val);
      const length = keys.length;
      const reversedObj = {};
      for (let i = 0; i < length; i++) {
        reversedObj[keys[i]] = values[length - i - 1];
      }
      reversedTokens[key] = reversedObj;
    });
    return reversedTokens;
  }
  export const tokensLight = reverseTokens(tokensDark);

  const baseFontFamily = ["Inter", "Segoe UI", "sans-serif"].join(",");
  
  // mui theme settings
  export const themeSettings = (mode) => {
      const isDark = mode === "dark";

      const palette = isDark
        ? {
            // palette values for dark mode
            primary: {
              ...tokensDark.primary,
              main: tokensDark.primary[300],
              light: tokensDark.primary[200],
              dark: tokensDark.primary[700],
            },
            secondary: {
              ...tokensDark.secondary,
              main: tokensDark.secondary[400],
              light: tokensDark.secondary[300],
              dark: tokensDark.secondary[700],
            },
            neutral: {
              ...tokensDark.grey,
              main: tokensDark.grey[400],
              dark: tokensDark.grey[700],
            },
            text: {
              primary: tokensDark.grey[0],
              secondary: tokensDark.grey[200],
            },
            divider: tokensDark.primary[500],
            background: {
              default: tokensDark.primary[800],
              paper: tokensDark.primary[700],
              alt: tokensDark.primary[600],
            },
          }
        : {
            // palette values for light mode
            primary: {
              ...tokensLight.primary,
              main: tokensDark.primary[500],
              light: tokensDark.primary[300],
              dark: tokensDark.primary[700],
            },
            secondary: {
              ...tokensLight.secondary,
              main: tokensDark.secondary[500],
              light: tokensDark.secondary[300],
              dark: tokensDark.secondary[700],
            },
            neutral: {
              ...tokensLight.grey,
              main: tokensDark.grey[500],
              dark: tokensDark.grey[700],
            },
            text: {
              primary: "#10233f",
              secondary: "#4d6280",
            },
            divider: "#d7e2f0",
            background: {
              default: "#e7f0fb",
              paper: tokensDark.grey[0],
              alt: "#f5f9ff",
            },
          };

    return {
        palette: {
          mode: mode,
          ...palette,
        },
        shape: {
          borderRadius: 12,
        },
      typography: {
          fontFamily: baseFontFamily,
          fontSize: 14,
        h1: {
            fontFamily: baseFontFamily,
          fontSize: 40,
            fontWeight: 800,
            letterSpacing: "-0.02em",
        },
        h2: {
            fontFamily: baseFontFamily,
          fontSize: 32,
            fontWeight: 800,
            letterSpacing: "-0.02em",
        },
        h3: {
            fontFamily: baseFontFamily,
          fontSize: 24,
            fontWeight: 700,
        },
        h4: {
            fontFamily: baseFontFamily,
          fontSize: 20,
            fontWeight: 700,
        },
        h5: {
            fontFamily: baseFontFamily,
          fontSize: 16,
            fontWeight: 700,
        },
        h6: {
            fontFamily: baseFontFamily,
          fontSize: 14,
            fontWeight: 700,
          },
          body1: {
            fontFamily: baseFontFamily,
            fontSize: 14,
            lineHeight: 1.55,
          },
          body2: {
            fontFamily: baseFontFamily,
            fontSize: 13,
            lineHeight: 1.5,
          },
          caption: {
            fontFamily: baseFontFamily,
            fontSize: 12,
            lineHeight: 1.4,
            letterSpacing: "0.02em",
        },
      },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: palette.background.default,
                color: palette.text.primary,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                border: `1px solid ${palette.divider}`,
                borderRadius: 14,
                boxShadow: "none",
                backgroundImage: "none",
                backgroundColor: palette.background.paper,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 10,
              },
            },
          },
        },
    };
  };