import { defineConfig } from "vitest/config";
import { playwright } from '@vitest/browser-playwright'

const config = defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/*.node.test.ts"],
        }
      },
      {
        extends: true,
        test: {
          name: "browser",
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [
              {
                browser: "chromium",
                headless: true,
              }
            ],
          },
          include: ["tests/*.browser.test.ts"],
        }
      }
    ],
  },
});

export default config;
