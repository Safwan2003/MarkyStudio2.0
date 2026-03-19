import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // jsdom provides window/document so browser-referencing imports don't crash at load time
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    globals: false,
    // Mock heavy browser-only packages at the module level
    server: {
      deps: {
        // Force vitest to inline these so vi.mock() intercepts them correctly
        inline: [/^@remotion/, /^remotion/, /^three/],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
