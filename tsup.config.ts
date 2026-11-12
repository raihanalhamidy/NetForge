import { cp } from "node:fs/promises";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  dts: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  async onSuccess() {
    await cp("src/ui/public", "dist/public", { recursive: true });
  },
});
