/**
 * Supported network device vendors.
 */
export type VendorType = "mikrotik" | "cisco" | "generic";

/**
 * Supported OLT vendors for GPON/EPON provisioning templates.
 */
export type OltVendorType = "vsol" | "zte" | "generic";

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
 * IP address pool definition (e.g., for MikroTik DHCP/PPPoE servers).
 */
export interface IpPoolConfig {
  name: string;
  ranges: string;
}

/**
 * PPPoE user bandwidth and addressing profile.
 */
export interface PppoeProfileConfig {
  name: string;
  local_address?: string;
  remote_pool: string;
  rate_limit?: string;
  dns_servers?: string[];
}

/**
 * PPPoE server configuration for ISP / RT-RW Net deployments.
 */
export interface PppoeConfig {
  service_name: string;
  interface: string;
  default_profile?: string;
  profiles: PppoeProfileConfig[];
}

/**
 * OLT Dynamic Bandwidth Allocation (DBA) profile definition.
 */
export interface OltDbaProfileConfig {
  id: number;
  name: string;
  bandwidth_kbps: number;
}

/**
 * OLT ONT line/service profile and VLAN mapping definition.
 */
export interface OltOntProfileConfig {
  profile_id: number;
  name: string;
  vlan_id: number;
  upload_limit?: string;
  download_limit?: string;
}

/**
 * OLT GPON/EPON provisioning configuration.
 */
export interface OltConfig {
  vendor?: OltVendorType;
  pon_ports?: number[];
  dba_profiles?: OltDbaProfileConfig[];
  ont_profiles?: OltOntProfileConfig[];
}

/**
 * Root configuration data model parsed from user YAML input.
 */
export interface NetworkData {
  device: DeviceConfig;
  vlans: VlanConfig[];
  interfaces: InterfaceConfig;
  ip_pools?: IpPoolConfig[];
  pppoe?: PppoeConfig;
  olt?: OltConfig;
}
