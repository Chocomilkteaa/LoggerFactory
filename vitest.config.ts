import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          environment: "node",
          include: ["tests/*.node.test.ts"],
          name: "node",
        }
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
              }
            ],
            provider: playwright(),
          },
          include: ["tests/*.browser.test.ts"],
          name: "browser",
        }
      }
    ],
  },
});

export default config;
