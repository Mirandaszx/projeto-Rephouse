import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
process.env.REPHOUSE_INTERFACE_TEST_RUN ??= randomUUID();
export const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://rephouse_interface_test:rephouse_interface_test_local@127.0.0.1:5544/rabbu_mvp_test";
export default defineConfig({
  globalTeardown: "./testes/encerrar-ambiente.ts",
  testDir: "./testes-pr2",
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: 0,
  outputDir: "../.devops-local/interface/resultados",
  reporter: [
    ["list"],
    [
      "json",
      { outputFile: "../.devops-local/interface/resultado-playwright.json" },
    ],
  ],
  // Os testes manipulam credenciais fictícias; traces e vídeos não são capturados.
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:5174",
    headless: true,
    channel:
      process.env.PLAYWRIGHT_CHANNEL ||
      (process.platform === "win32" ? "msedge" : "chromium"),
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  webServer: [
    {
      command: "node --import tsx ferramentas/interface/servidor-teste.ts",
      cwd: root,
      env: {
        TEST_DATABASE_URL: testDatabaseUrl,
        REPHOUSE_INTERFACE_TEST_RUN: process.env.REPHOUSE_INTERFACE_TEST_RUN,
      },
      url: "http://127.0.0.1:3405/api/ready",
      reuseExistingServer: false,
      timeout: 60_000,
      stdout: "ignore",
    },
    {
      command:
        "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174",
      env: { API_PROXY_TARGET: "http://127.0.0.1:3405", VITE_API_BASE_URL: "" },
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
