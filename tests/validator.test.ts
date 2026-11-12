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
});

