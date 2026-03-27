import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://www.valfarandsons.com",
  vite: {
    plugins: [tailwindcss()],
  },
});
