/**
 * Supported network device vendors.
 */
export type VendorType = "mikrotik" | "cisco" | "generic";

/**
 * Target network device identity and management settings.
 */
export interface DeviceConfig {
  hostname: string;
  vendor: VendorType;
  mgmt_ip: string;
  gateway?: string;
}

/**
 * IEEE 802.1Q VLAN definition (valid ID range: 1-4094).
 */
export interface VlanConfig {
  id: number;
  name: string;
  description?: string;
}

/**
 * Access port mapping to a specific VLAN ID.
 */
export interface AccessInterfaceConfig {
  name: string;
  vlan_id: number;
}

/**
 * Device interface role assignments.
 */
export interface InterfaceConfig {
  trunk: string[];
  access?: AccessInterfaceConfig[];
}

/**
 * Root configuration data model parsed from user YAML input.
 */
export interface NetworkData {
  device: DeviceConfig;
  vlans: VlanConfig[];
  interfaces: InterfaceConfig;
}

