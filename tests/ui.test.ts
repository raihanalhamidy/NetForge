import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createUiApp } from "../src/ui/server.js";

describe("NetForge UI Server API", () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createUiApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it("lists all .njk templates recursively via GET /api/templates", async () => {
    const res = await fetch(`${baseUrl}/api/templates`);
    const body = (await res.json()) as { success: boolean; templates: string[] };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.templates).toContain("templates/mikrotik/vlan_trunk.njk");
    expect(body.templates).toContain("templates/mikrotik/isp_pppoe.njk");
    expect(body.templates).toContain("templates/cisco/vlan_access.njk");
    expect(body.templates).toContain("templates/olt/gpon_profile.njk");
  });

  it("lists YAML presets with content via GET /api/samples", async () => {
    const res = await fetch(`${baseUrl}/api/samples`);
    const body = (await res.json()) as {
      success: boolean;
      samples: Array<{ name: string; path: string; content: string }>;
    };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.samples.some((s) => s.name === "mikrotik_vlan.yaml")).toBe(true);
    expect(body.samples.some((s) => s.name === "mikrotik_pppoe.yaml")).toBe(true);
    expect(body.samples.some((s) => s.name === "olt_gpon.yaml")).toBe(true);
  });

  it("renders valid YAML against a selected template via POST /api/render", async () => {
    const yamlContent = [
      "device:",
      '  hostname: "UI-TEST-SW"',
      '  vendor: "cisco"',
      '  mgmt_ip: "10.10.20.2/24"',
      "vlans:",
      "  - id: 10",
      '    name: "MGMT"',
      "interfaces:",
      "  trunk:",
      '    - "GigabitEthernet0/1"',
    ].join("\n");

    const res = await fetch(`${baseUrl}/api/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templatePath: "templates/cisco/vlan_access.njk",
        yamlContent,
      }),
    });
    const body = (await res.json()) as {
      success: boolean;
      result: string;
      meta: { hostname: string; vendor: string };
    };

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.result).toContain("hostname UI-TEST-SW");
    expect(body.result).toContain("ip address 10.10.20.2 255.255.255.0");
    expect(body.meta).toEqual({ hostname: "UI-TEST-SW", vendor: "cisco" });
  });

  it("returns 400 with descriptive error when Zod validation fails", async () => {
    const badYaml = [
      "device:",
      '  hostname: ""',
      '  vendor: "cisco"',
      '  mgmt_ip: "invalid"',
      "vlans: []",
      "interfaces:",
      "  trunk: []",
    ].join("\n");

    const res = await fetch(`${baseUrl}/api/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templatePath: "templates/cisco/vlan_access.njk",
        yamlContent: badYaml,
      }),
    });
    const body = (await res.json()) as { success: boolean; error: string };

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain("device.mgmt_ip");
  });

  it("blocks path traversal outside templates directory", async () => {
    const res = await fetch(`${baseUrl}/api/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templatePath: "../package.json",
        yamlContent: "device:\n  hostname: x",
      }),
    });
    const body = (await res.json()) as { success: boolean; error: string };

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("returns 204 No Content for /favicon.ico", async () => {
    const res = await fetch(`${baseUrl}/favicon.ico`);
    expect(res.status).toBe(204);
  });
});

