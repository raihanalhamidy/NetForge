import { describe, expect, it } from "vitest";
import { renderConfig, TemplateRenderError } from "../src/core/renderer.js";
import type { NetworkData } from "../src/types/config.js";

const mikrotikSample: NetworkData = {
  device: {
    hostname: "RB-DIST-01",
    vendor: "mikrotik",
    mgmt_ip: "192.168.88.2/24",
    gateway: "192.168.88.1",
  },
  vlans: [
    { id: 10, name: "Management", description: "Management Network" },
    { id: 20, name: "Hotspot", description: "Hotspot Client Network" },
  ],
  interfaces: {
    trunk: ["ether1", "ether2"],
    access: [{ name: "ether3", vlan_id: 20 }],
  },
};

const ciscoSample: NetworkData = {
  device: {
    hostname: "SW-ACCESS-01",
    vendor: "cisco",
    mgmt_ip: "10.10.10.2/24",
    gateway: "10.10.10.1",
  },
  vlans: [
    { id: 100, name: "Voice" },
    { id: 200, name: "Data" },
  ],
  interfaces: {
    trunk: ["GigabitEthernet0/1"],
    access: [{ name: "GigabitEthernet0/2", vlan_id: 200 }],
  },
};

describe("renderConfig", () => {
  it("renders MikroTik RouterOS configuration with required commands and no HTML escaping", async () => {
    const output = await renderConfig(
      "templates/mikrotik/vlan_trunk.njk",
      mikrotikSample
    );

    expect(output).toContain('/system identity set name="RB-DIST-01"');
    expect(output).toContain("/interface bridge add name=bridge1 vlan-filtering=yes");
    expect(output).toContain("/interface bridge port add bridge=bridge1 interface=ether1");
    expect(output).toContain("/interface bridge port add bridge=bridge1 interface=ether3 pvid=20");
    expect(output).toContain(
      '/interface vlan add interface=bridge1 name=Management vlan-id=10 comment="Management Network"'
    );
    expect(output).toContain(
      "/interface bridge vlan add bridge=bridge1 tagged=ether1,ether2 untagged=ether3 vlan-ids=20"
    );
    expect(output).toContain("/ip address add address=192.168.88.2/24 interface=bridge1");
    expect(output).toContain("/ip route add dst-address=0.0.0.0/0 gateway=192.168.88.1");
    expect(output).not.toContain("&quot;");
  });

  it("renders Cisco IOS configuration with converted subnet mask and trunk/access commands", async () => {
    const output = await renderConfig(
      "templates/cisco/vlan_access.njk",
      ciscoSample
    );

    expect(output).toContain("hostname SW-ACCESS-01");
    expect(output).toContain("vlan 100");
    expect(output).toContain(" name Voice");
    expect(output).toContain("ip address 10.10.10.2 255.255.255.0");
    expect(output).toContain("ip default-gateway 10.10.10.1");
    expect(output).toContain("switchport mode trunk");
    expect(output).toContain("switchport trunk allowed vlan 100,200");
    expect(output).toContain("switchport mode access");
    expect(output).toContain("switchport access vlan 200");
  });

  it("converts non-/24 CIDR prefixes properly in Cisco template", async () => {
    const customCidrData: NetworkData = {
      ...ciscoSample,
      device: {
        ...ciscoSample.device,
        mgmt_ip: "172.16.0.5/28",
      },
    };

    const output = await renderConfig(
      "templates/cisco/vlan_access.njk",
      customCidrData
    );

    expect(output).toContain("ip address 172.16.0.5 255.255.255.240");
  });

  it("throws descriptive TemplateRenderError when template file is not found", async () => {
    const missingTemplate = "templates/mikrotik/missing_template.njk";

    await expect(
      renderConfig(missingTemplate, mikrotikSample)
    ).rejects.toThrow(TemplateRenderError);

    await expect(
      renderConfig(missingTemplate, mikrotikSample)
    ).rejects.toThrow(`File template tidak ditemukan di: ${missingTemplate}`);
  });
});

