import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const loadedEnvFiles = new Set<string>();

export function loadRootEnv() {
  for (const candidate of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")]) {
    if (loadedEnvFiles.has(candidate) || !existsSync(candidate)) {
      continue;
    }

    loadedEnvFiles.add(candidate);
    const contents = readFileSync(candidate, "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");

      process.env[key] ??= value;
    }
  }
}
