import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express, type Request, type Response } from "express";
import YAML, { YAMLParseError } from "yaml";
import { renderConfig } from "../core/renderer.js";
import { validateNetworkData } from "../core/validator.js";

export interface SampleEntry {
  name: string;
  path: string;
  content: string;
}

interface RenderRequestBody {
  templatePath?: unknown;
  yamlContent?: unknown;
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

/**
 * Resolves the static frontend directory across both `tsx` dev mode (`src/ui/public`)
 * and `tsup` production builds (`dist/public`).
 */
export function resolveUiPublicDir(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(currentDir, "public"),
    path.resolve(process.cwd(), "src/ui/public"),
    path.resolve(process.cwd(), "dist/public"),
  ];

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return candidates[0];
}

async function scanTemplatesRecursively(
  dir: string,
  projectRoot: string
): Promise<string[]> {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await scanTemplatesRecursively(fullPath, projectRoot);
      results.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith(".njk")) {
      results.push(toPosixPath(path.relative(projectRoot, fullPath)));
    }
  }

  return results.sort((a, b) => a.localeCompare(b));
}

async function loadSampleFiles(projectRoot: string): Promise<SampleEntry[]> {
  const samplesDir = path.join(projectRoot, "data", "samples");
  if (!existsSync(samplesDir)) {
    return [];
  }

  const entries = await readdir(samplesDir, { withFileTypes: true });
  const yamlFiles = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml"))
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const samples: SampleEntry[] = [];
  for (const file of yamlFiles) {
    const fullPath = path.join(samplesDir, file.name);
    const content = await readFile(fullPath, "utf-8");
    samples.push({
      name: file.name,
      path: toPosixPath(path.relative(projectRoot, fullPath)),
      content,
    });
  }

  return samples;
}

/**
 * Creates and configures the Express application for the NetForge Web UI dashboard.
 */
export function createUiApp(projectRoot = process.cwd()): Express {
  const app = express();
  const publicDir = resolveUiPublicDir();
  const templatesRoot = path.resolve(projectRoot, "templates");

  app.use(express.json({ limit: "1mb" }));

  app.get("/api/templates", async (_req: Request, res: Response) => {
    try {
      const templates = await scanTemplatesRecursively(
        templatesRoot,
        projectRoot
      );
      res.json({ success: true, templates });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memindai template.";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get("/api/samples", async (_req: Request, res: Response) => {
    try {
      const samples = await loadSampleFiles(projectRoot);
      res.json({ success: true, samples });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal memuat data sample.";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/api/render", async (req: Request, res: Response) => {
    const { templatePath, yamlContent } = (req.body ?? {}) as RenderRequestBody;

    if (typeof templatePath !== "string" || templatePath.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "Template path wajib dipilih.",
      });
      return;
    }

    if (typeof yamlContent !== "string" || yamlContent.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: "Konten YAML tidak boleh kosong.",
      });
      return;
    }

    const resolvedTemplate = path.resolve(projectRoot, templatePath);
    const isInsideTemplates =
      resolvedTemplate.startsWith(`${templatesRoot}${path.sep}`) &&
      resolvedTemplate.endsWith(".njk");

    if (!isInsideTemplates) {
      res.status(400).json({
        success: false,
        error: "Path template harus berupa file .njk di dalam direktori templates/.",
      });
      return;
    }

    try {
      let parsedYaml: unknown;
      try {
        parsedYaml = YAML.parse(yamlContent);
      } catch (error) {
        const reason =
          error instanceof YAMLParseError || error instanceof Error
            ? error.message
            : String(error);
        throw new Error(`Sintaks YAML tidak valid: ${reason}`);
      }

      const validatedData = validateNetworkData(parsedYaml);
      const rendered = await renderConfig(resolvedTemplate, validatedData);

      res.json({
        success: true,
        result: rendered,
        meta: {
          hostname: validatedData.device.hostname,
          vendor: validatedData.device.vendor,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal me-render konfigurasi.";
      res.status(400).json({ success: false, error: message });
    }
  });

  app.get("/favicon.ico", (_req: Request, res: Response) => {
    res.status(204).end();
  });

  app.use(express.static(publicDir));

  app.get("/", (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });

  return app;
}

