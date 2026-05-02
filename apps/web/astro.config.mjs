import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  output: "static",
  build: { format: "file" },
  trailingSlash: "never",
  integrations: [tailwind()],
});
