import { createConfig as createNodeConfig } from "@chocomilktea/config-store/eslint/node";
import { createConfig as createTestConfig } from "@chocomilktea/config-store/eslint/test";

export default [...createNodeConfig({}), ...createTestConfig({})];
