import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import { parseConfigFile } from "../core/parser.js";
import { renderConfig } from "../core/renderer.js";

/**
 * CLI options accepted by the `netforge build` command.
 */
export interface BuildCommandOptions {
  template: string;
  data: string;
  output?: string;
}

/**
 * Handles the `netforge build` command: parses YAML data, validates it,
 * renders the target Nunjucks template, and writes or prints the output.
 */
export async function handleBuildCommand(
  options: BuildCommandOptions
): Promise<void> {
  try {
    console.log(
      pc.cyan(`⏳ Memproses data konfigurasi dari: ${pc.bold(options.data)}`)
    );
    const parsedData = await parseConfigFile(options.data);

    console.log(
      pc.cyan(
        `⚙  Me-render template ${pc.bold(options.template)} untuk ${pc.bold(parsedData.device.hostname)} (${parsedData.device.vendor})...`
      )
    );
    const renderedConfig = await renderConfig(options.template, parsedData);

    if (options.output) {
      const resolvedOutput = path.resolve(options.output);
      await mkdir(path.dirname(resolvedOutput), { recursive: true });
      await writeFile(resolvedOutput, renderedConfig, "utf-8");

      console.log(
        pc.green(`✔ Konfigurasi berhasil disimpan ke: ${options.output}`)
      );
      return;
    }

    const divider = pc.dim("=".repeat(60));
    console.log(`\n${divider}`);
    console.log(
      pc.bold(
        pc.yellow(
          `Konfigurasi: ${parsedData.device.hostname} (${parsedData.device.vendor})`
        )
      )
    );
    console.log(divider);
    console.log(renderedConfig.trimEnd());
    console.log(`${divider}\n`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Terjadi error yang tidak diketahui.";
    console.error(pc.red(`✖ ${message}`));
    process.exit(1);
  }
}

