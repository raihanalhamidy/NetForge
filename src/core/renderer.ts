import { access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import nunjucks from "nunjucks";
import type { NetworkData } from "../types/config.js";

/**
 * Error thrown when loading or rendering a Nunjucks template fails.
 */
export class TemplateRenderError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TemplateRenderError";
  }
}

function extractIpFromCidr(value: string): string {
  const [ip] = value.split("/");
  return ip ?? value;
}

function cidrToNetmask(value: string): string {
  const parts = value.split("/");
  if (parts.length !== 2) {
    return value;
  }

  const prefix = Number(parts[1]);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return value;
  }

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return [
    (mask >>> 24) & 255,
    (mask >>> 16) & 255,
    (mask >>> 8) & 255,
    mask & 255,
  ].join(".");
}

function createNunjucksEnv(templateDir: string): nunjucks.Environment {
  const loader = new nunjucks.FileSystemLoader(templateDir, {
    noCache: true,
  });

  const env = new nunjucks.Environment(loader, {
    autoescape: false,
    trimBlocks: true,
    lstripBlocks: true,
  });

  env.addFilter("ip_only", extractIpFromCidr);
  env.addFilter("subnet_mask", cidrToNetmask);

  return env;
}

/**
 * Renders a network configuration template with validated {@link NetworkData}.
 */
export async function renderConfig(
  templatePath: string,
  data: NetworkData
): Promise<string> {
  const resolvedPath = path.resolve(templatePath);

  try {
    await access(resolvedPath, constants.F_OK);
  } catch (error) {
    throw new TemplateRenderError(
      `File template tidak ditemukan di: ${templatePath}`,
      { cause: error }
    );
  }

  const templateDir = path.dirname(resolvedPath);
  const templateName = path.basename(resolvedPath);
  const env = createNunjucksEnv(templateDir);

  try {
    return env.render(templateName, data);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new TemplateRenderError(
      `Gagal me-render template ${templatePath}: ${reason}`,
      { cause: error }
    );
  }
}

