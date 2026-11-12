import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ConfigParseError, parseConfigFile } from "../src/core/parser.js";
import { NetworkValidationError } from "../src/core/validator.js";

describe("parseConfigFile", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
    );
  });

  async function createTempYamlFile(
    filename: string,
    content: string
  ): Promise<string> {
    const dir = await mkdtemp(path.join(os.tmpdir(), "netforge-parser-"));
    tempDirs.push(dir);
    const filePath = path.join(dir, filename);
    await writeFile(filePath, content, "utf-8");
    return filePath;
  }

  it("parses sample MikroTik YAML file accurately", async () => {
    const data = await parseConfigFile("data/samples/mikrotik_vlan.yaml");

    expect(data.device.hostname).toBe("RB-DIST-01");
    expect(data.device.vendor).toBe("mikrotik");
    expect(data.device.mgmt_ip).toBe("192.168.88.2/24");
    expect(data.device.gateway).toBe("192.168.88.1");
    expect(data.vlans).toHaveLength(3);
    expect(data.vlans.map((v) => v.id)).toEqual([10, 20, 30]);
    expect(data.interfaces.trunk).toEqual(["ether1", "ether2"]);
    expect(data.interfaces.access).toEqual([
      { name: "ether3", vlan_id: 20 },
      { name: "ether4", vlan_id: 30 },
    ]);
  });

  it("throws descriptive ConfigParseError when file is not found", async () => {
    const missingPath = "data/samples/does_not_exist.yaml";

    await expect(parseConfigFile(missingPath)).rejects.toThrow(
      ConfigParseError
    );
    await expect(parseConfigFile(missingPath)).rejects.toThrow(
      `File konfigurasi tidak ditemukan di: ${missingPath}`
    );
  });

  it("throws ConfigParseError when YAML syntax is corrupt", async () => {
    const corruptFile = await createTempYamlFile(
      "corrupt.yaml",
      "device:\n  hostname: [unclosed_bracket\n  vendor: mikrotik"
    );

    await expect(parseConfigFile(corruptFile)).rejects.toThrow(
      ConfigParseError
    );
    await expect(parseConfigFile(corruptFile)).rejects.toThrow(
      /Sintaks YAML tidak valid/
    );
  });

  it("throws NetworkValidationError when YAML is syntactically valid but fails schema", async () => {
    const invalidSchemaFile = await createTempYamlFile(
      "invalid_schema.yaml",
      [
        "device:",
        '  hostname: "BAD-SW"',
        '  vendor: "mikrotik"',
        '  mgmt_ip: "not-a-cidr"',
        "vlans:",
        "  - id: 9999",
        '    name: "BAD"',
        "interfaces:",
        "  trunk:",
        '    - "ether1"',
      ].join("\n")
    );

    await expect(parseConfigFile(invalidSchemaFile)).rejects.toThrow(
      NetworkValidationError
    );
  });
});

