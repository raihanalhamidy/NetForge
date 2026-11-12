import { Command } from "commander";
import pc from "picocolors";
import { handleBuildCommand } from "./commands/build.js";
import { handleInitCommand } from "./commands/init.js";
import { handleUiCommand } from "./commands/ui.js";

const program = new Command();

program
  .name("netforge")
  .description("Declarative multi-vendor network device config generator CLI")
  .version("0.1.0")
  .showHelpAfterError(
    pc.dim("(Gunakan --help untuk melihat daftar perintah dan opsi yang tersedia)")
  )
  .configureOutput({
    outputError: (str, write) => write(pc.red(str)),
  });

program
  .command("init")
  .description(
    "Jalankan wizard interaktif untuk membuat file konfigurasi YAML baru"
  )
  .option(
    "-o, --output <path>",
    "Path file YAML hasil generate",
    "./netforge-config.yaml"
  )
  .action(handleInitCommand);

program
  .command("build")
  .description(
    "Generate konfigurasi perangkat jaringan dari file YAML dan template Nunjucks"
  )
  .requiredOption("-t, --template <path>", "Path ke file template .njk")
  .requiredOption("-d, --data <path>", "Path ke file data input YAML")
  .option("-o, --output <path>", "Path output file konfigurasi")
  .action(handleBuildCommand);

program
  .command("ui")
  .description("Jalankan Local Web GUI Dashboard di browser")
  .option("-p, --port <number>", "Port server Web UI", "3000")
  .option("--no-open", "Jangan buka browser secara otomatis")
  .action(handleUiCommand);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Terjadi error yang tidak diketahui.";
  console.error(pc.red(`✖ ${message}`));
  process.exit(1);
});
