import { Command } from "commander";
import pc from "picocolors";
import { handleBuildCommand } from "./commands/build.js";

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
  .command("build")
  .description(
    "Generate konfigurasi perangkat jaringan dari file YAML dan template Nunjucks"
  )
  .requiredOption("-t, --template <path>", "Path ke file template .njk")
  .requiredOption("-d, --data <path>", "Path ke file data input YAML")
  .option("-o, --output <path>", "Path output file konfigurasi")
  .action(handleBuildCommand);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Terjadi error yang tidak diketahui.";
  console.error(pc.red(`✖ ${message}`));
  process.exit(1);
});
