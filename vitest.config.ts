import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    globals: true,
    onConsoleLog: () => {
      return false;
    },
    projects: [
      {
        extends: true,
        test: {
          environment: "node",
          include: ["tests/*.node.unit.test.ts"],
          name: "node:unit",
        },
      },
      {
        extends: true,
        test: {
          environment: "node",
          include: ["tests/*.node.integration.test.ts"],
          name: "node:integration",
        },
      },
      {
        extends: true,
        test: {
          browser: {
            enabled: true,
            instances: [
              {
                browser: "chromium",
                headless: true,
              },
              {
                browser: "firefox",
                headless: true,
              },
              {
                browser: "webkit",
                headless: true,
              },
            ],
            provider: playwright(),
          },
          include: ["tests/*.browser.test.ts"],
          name: "browser",
        },
      },
    ],
  },
});

export default config;
