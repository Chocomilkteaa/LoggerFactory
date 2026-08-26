import { defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    include: ["tests/*.test.ts"],
  },
});

export default config;
