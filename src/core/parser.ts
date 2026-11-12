import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import YAML, { YAMLParseError } from "yaml";
import { validateNetworkData } from "./validator.js";
import type { NetworkData } from "../types/config.js";

/**
 * Error thrown when reading or parsing a YAML configuration file fails.
 */
export class ConfigParseError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ConfigParseError";
  }
}

/**
 * Reads, parses, and validates a NetForge YAML configuration file.
 */
export async function parseConfigFile(filePath: string): Promise<NetworkData> {
  const resolvedPath = path.resolve(filePath);

  try {
    await access(resolvedPath, constants.F_OK);
  } catch (error) {
    throw new ConfigParseError(
      `File konfigurasi tidak ditemukan di: ${filePath}`,
      { cause: error }
    );
  }

  let rawContent: string;
  try {
    rawContent = await readFile(resolvedPath, "utf-8");
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ConfigParseError(
      `Gagal membaca file konfigurasi di ${filePath}: ${reason}`,
      { cause: error }
    );
  }

  let parsedData: unknown;
  try {
    parsedData = YAML.parse(rawContent);
  } catch (error) {
    const reason =
      error instanceof YAMLParseError || error instanceof Error
        ? error.message
        : String(error);
    throw new ConfigParseError(
      `Sintaks YAML tidak valid di ${filePath}: ${reason}`,
      { cause: error }
    );
  }

  return validateNetworkData(parsedData);
}

