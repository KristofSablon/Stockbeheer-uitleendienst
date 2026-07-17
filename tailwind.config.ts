import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Huisstijl gemeente Londerzeel
        londerzeel: {
          geel: "#FBBB16",
          geelDonker: "#E0A400",
          geelLicht: "#FDECC0",
          inkt: "#1A1A1A",
          grijs: "#F2F2F2",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
