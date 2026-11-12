import { describe, expect, it } from "vitest";
import {
  NetworkValidationError,
  validateNetworkData,
} from "../src/core/validator.js";

function createValidData() {
  return {
    device: {
      hostname: "SW-CORE-01",
      vendor: "mikrotik" as const,
      mgmt_ip: "192.168.10.2/24",
      gateway: "192.168.10.1",
    },
    vlans: [
      { id: 10, name: "MGMT", description: "Management Network" },
      { id: 20, name: "STAFF" },
    ],
    interfaces: {
      trunk: ["ether1", "ether2"],
      access: [{ name: "ether3", vlan_id: 20 }],
    },
  };
}

describe("validateNetworkData", () => {
  it("accepts complete valid network configuration data", () => {
    const input = createValidData();
    const result = validateNetworkData(input);

    expect(result).toEqual(input);
  });

  it("accepts minimal valid network configuration without optional fields", () => {
    const input = {
      device: {
        hostname: "RTR-EDGE-01",
        vendor: "generic",
        mgmt_ip: "10.0.0.1/8",
      },
      vlans: [{ id: 1, name: "DEFAULT" }, { id: 4094, name: "MAX_VLAN" }],
      interfaces: {
        trunk: ["eth0"],
      },
    };

    const result = validateNetworkData(input);
    expect(result.device.vendor).toBe("generic");
    expect(result.device.gateway).toBeUndefined();
    expect(result.interfaces.access).toBeUndefined();
  });

  it("rejects VLAN ID below 1", () => {
    const input = createValidData();
    input.vlans[0].id = 0;

    expect(() => validateNetworkData(input)).toThrow(NetworkValidationError);
    expect(() => validateNetworkData(input)).toThrow(/vlans\.0\.id/);
  });

  it("rejects VLAN ID above 4094", () => {
    const input = createValidData();
    input.vlans[0].id = 4095;

    expect(() => validateNetworkData(input)).toThrow(NetworkValidationError);
    expect(() => validateNetworkData(input)).toThrow(/vlans\.0\.id/);
  });

  it("rejects non-integer (decimal) VLAN ID", () => {
    const input = createValidData();
    input.vlans[0].id = 10.5;

    expect(() => validateNetworkData(input)).toThrow(NetworkValidationError);
    expect(() => validateNetworkData(input)).toThrow(/vlans\.0\.id/);
  });

  it("rejects invalid access interface VLAN ID", () => {
    const input = createValidData();
    input.interfaces.access = [{ name: "ether3", vlan_id: 5000 }];

    expect(() => validateNetworkData(input)).toThrow(NetworkValidationError);
    expect(() => validateNetworkData(input)).toThrow(
      /interfaces\.access\.0\.vlan_id/
    );
  });

  it.each([
    "192.168.10.2",
    "256.168.10.2/24",
    "192.168.10.2/33",
    "invalid-ip",
    "192.168.10/24",
  ])("rejects invalid mgmt_ip format: %s", (badIp) => {
    const input = createValidData();
    input.device.mgmt_ip = badIp;

    expect(() => validateNetworkData(input)).toThrow(NetworkValidationError);
    expect(() => validateNetworkData(input)).toThrow(/device\.mgmt_ip/);
  });

  it("rejects unsupported vendor values", () => {
    const input = {
      ...createValidData(),
      device: {
        ...createValidData().device,
        vendor: "juniper",
      },
    };

    expect(() => validateNetworkData(input)).toThrow(NetworkValidationError);
    expect(() => validateNetworkData(input)).toThrow(/device\.vendor/);
  });

  it("accepts optional ip_pools, pppoe, and olt fields when valid", () => {
    const input = {
      ...createValidData(),
      ip_pools: [
        { name: "pool-pppoe", ranges: "100.64.10.2-100.64.10.254" },
      ],
      pppoe: {
        service_name: "ISP-PPPOE",
        interface: "vlan100",
        default_profile: "10M",
        profiles: [
          {
            name: "10M",
            local_address: "100.64.10.1",
            remote_pool: "pool-pppoe",
            rate_limit: "10M/10M",
            dns_servers: ["1.1.1.1", "8.8.8.8"],
          },
        ],
      },
      olt: {
        vendor: "vsol" as const,
        pon_ports: [1, 2],
        dba_profiles: [{ id: 10, name: "DBA-100M", bandwidth_kbps: 102400 }],
        ont_profiles: [
          {
            profile_id: 10,
            name: "ONT-INET",
            vlan_id: 100,
            upload_limit: "20M",
            download_limit: "20M",
          },
        ],
      },
    };

    const result = validateNetworkData(input);
    expect(result.ip_pools).toHaveLength(1);
    expect(result.pppoe?.profiles).toHaveLength(1);
    expect(result.olt?.vendor).toBe("vsol");
  });

  it("rejects invalid ip_pools range format and invalid OLT ONT VLAN ID", () => {
    const input = {
      ...createValidData(),
      ip_pools: [{ name: "bad-pool", ranges: "not-an-ip-range" }],
      olt: {
        vendor: "zte" as const,
        ont_profiles: [{ profile_id: 1, name: "BAD-ONT", vlan_id: 5000 }],
      },
    };

    expect(() => validateNetworkData(input)).toThrow(NetworkValidationError);
    expect(() => validateNetworkData(input)).toThrow(/ip_pools\.0\.ranges/);
  });
});

