import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  build: { format: "file" },
  trailingSlash: "never",
  integrations: [tailwind()],
});
