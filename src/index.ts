import pc from "picocolors";
import { parseConfigFile } from "./core/parser.js";

async function testParse(filePath: string): Promise<void> {
  console.log(pc.bold(pc.cyan(`\n=== Parsing: ${filePath} ===`)));
  try {
    const config = await parseConfigFile(filePath);
    console.log(
      pc.green(
        `✔ File berhasil diparsing! Hostname: ${pc.bold(config.device.hostname)} | Vendor: ${config.device.vendor} | Jumlah VLAN terdeteksi: ${pc.bold(String(config.vlans.length))}`
      )
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error(pc.red(`✖ ${error.message}`));
    } else {
      console.error(pc.red("✖ Terjadi error yang tidak diketahui."));
    }
  }
}

async function main(): Promise<void> {
  console.log(pc.bold("⚡ NetForge CLI - YAML Parser Test"));
  await testParse("data/samples/mikrotik_vlan.yaml");
  await testParse("data/samples/cisco_vlan.yaml");
  await testParse("data/samples/file_tidak_ada.yaml");
}

void main();
