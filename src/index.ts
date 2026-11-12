import pc from "picocolors";
import { parseConfigFile } from "./core/parser.js";
import { renderConfig } from "./core/renderer.js";

async function testRenderFlow(
  label: string,
  yamlPath: string,
  templatePath: string
): Promise<void> {
  console.log(pc.bold(pc.cyan(`\n=== ${label} ===`)));
  console.log(pc.dim(`YAML     : ${yamlPath}`));
  console.log(pc.dim(`Template : ${templatePath}`));

  try {
    const data = await parseConfigFile(yamlPath);
    const rendered = await renderConfig(templatePath, data);

    console.log(
      pc.green(
        `✔ Berhasil render konfigurasi untuk ${pc.bold(data.device.hostname)} (${data.device.vendor})`
      )
    );
    console.log(pc.yellow("--- Preview Output ---"));
    console.log(pc.white(rendered.trimEnd()));
    console.log(pc.yellow("--- End Preview ---"));
  } catch (error) {
    if (error instanceof Error) {
      console.error(pc.red(`✖ ${error.message}`));
    } else {
      console.error(pc.red("✖ Terjadi error yang tidak diketahui."));
    }
  }
}

async function main(): Promise<void> {
  console.log(pc.bold("⚡ NetForge CLI - Template Renderer Integration Test"));

  await testRenderFlow(
    "MikroTik RouterOS",
    "data/samples/mikrotik_vlan.yaml",
    "templates/mikrotik/vlan_trunk.njk"
  );

  await testRenderFlow(
    "Cisco IOS",
    "data/samples/cisco_vlan.yaml",
    "templates/cisco/vlan_access.njk"
  );
}

void main();
