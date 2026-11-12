import { z } from "zod";
import type { NetworkData } from "../types/config.js";

const IPV4_PATTERN =
  "(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";

const IPV4_REGEX = new RegExp(`^${IPV4_PATTERN}$`);
const IPV4_CIDR_REGEX = new RegExp(`^${IPV4_PATTERN}\\/(?:3[0-2]|[12]?\\d)$`);
const IPV4_RANGE_REGEX = new RegExp(`^${IPV4_PATTERN}-${IPV4_PATTERN}$`);

const vlanIdSchema = z
  .number()
  .int("VLAN ID must be an integer")
  .min(1, "VLAN ID must be at least 1")
  .max(4094, "VLAN ID must be at most 4094");

/**
 * Runtime validation schema for a single VLAN entry.
 */
export const vlanSchema = z.object({
  id: vlanIdSchema,
  name: z.string().trim().min(1, "VLAN name cannot be empty"),
  description: z.string().optional(),
});

/**
 * Runtime validation schema for device metadata and management IP.
 */
export const deviceSchema = z.object({
  hostname: z.string().trim().min(1, "Hostname cannot be empty"),
  vendor: z.enum(["mikrotik", "cisco", "generic"]),
  mgmt_ip: z
    .string()
    .regex(
      IPV4_CIDR_REGEX,
      "Invalid management IP format. Expected IPv4/CIDR (e.g., 192.168.10.1/24)"
    ),
  gateway: z
    .string()
    .regex(
      IPV4_REGEX,
      "Invalid gateway IP format. Expected IPv4 address (e.g., 192.168.10.254)"
    )
    .optional(),
});

/**
 * Runtime validation schema for an access interface entry.
 */
export const accessInterfaceSchema = z.object({
  name: z.string().trim().min(1, "Access interface name cannot be empty"),
  vlan_id: z
    .number()
    .int("Access VLAN ID must be an integer")
    .min(1, "Access VLAN ID must be at least 1")
    .max(4094, "Access VLAN ID must be at most 4094"),
});

/**
 * Runtime validation schema for trunk and access interface lists.
 */
export const interfaceSchema = z.object({
  trunk: z.array(
    z.string().trim().min(1, "Trunk interface name cannot be empty")
  ),
  access: z.array(accessInterfaceSchema).optional(),
});

/**
 * Runtime validation schema for an IP address pool entry.
 */
export const ipPoolSchema = z.object({
  name: z.string().trim().min(1, "IP pool name cannot be empty"),
  ranges: z
    .string()
    .trim()
    .min(1, "IP pool ranges cannot be empty")
    .refine(
      (value) =>
        value
          .split(",")
          .map((part) => part.trim())
          .every(
            (part) =>
              IPV4_REGEX.test(part) ||
              IPV4_CIDR_REGEX.test(part) ||
              IPV4_RANGE_REGEX.test(part)
          ),
      "Invalid IP pool range format. Expected IPv4, IPv4/CIDR, or start-end IPv4 range"
    ),
});

/**
 * Runtime validation schema for a PPPoE user profile.
 */
export const pppoeProfileSchema = z.object({
  name: z.string().trim().min(1, "PPPoE profile name cannot be empty"),
  local_address: z
    .string()
    .regex(IPV4_REGEX, "Invalid PPPoE local address format (expected IPv4)")
    .optional(),
  remote_pool: z.string().trim().min(1, "Remote pool name cannot be empty"),
  rate_limit: z.string().trim().min(1, "Rate limit cannot be empty").optional(),
  dns_servers: z
    .array(z.string().regex(IPV4_REGEX, "Invalid DNS server IPv4 address"))
    .optional(),
});

/**
 * Runtime validation schema for PPPoE server configuration.
 */
export const pppoeSchema = z.object({
  service_name: z.string().trim().min(1, "PPPoE service name cannot be empty"),
  interface: z.string().trim().min(1, "PPPoE interface cannot be empty"),
  default_profile: z
    .string()
    .trim()
    .min(1, "Default PPPoE profile cannot be empty")
    .optional(),
  profiles: z
    .array(pppoeProfileSchema)
    .min(1, "At least one PPPoE profile is required"),
});

/**
 * Runtime validation schema for an OLT DBA profile.
 */
export const oltDbaProfileSchema = z.object({
  id: z.number().int("DBA profile ID must be an integer").min(1),
  name: z.string().trim().min(1, "DBA profile name cannot be empty"),
  bandwidth_kbps: z
    .number()
    .int("DBA bandwidth must be an integer")
    .positive("DBA bandwidth (kbps) must be positive"),
});

/**
 * Runtime validation schema for an OLT ONT profile.
 */
export const oltOntProfileSchema = z.object({
  profile_id: z.number().int("ONT profile ID must be an integer").min(1),
  name: z.string().trim().min(1, "ONT profile name cannot be empty"),
  vlan_id: vlanIdSchema,
  upload_limit: z
    .string()
    .trim()
    .min(1, "Upload limit cannot be empty")
    .optional(),
  download_limit: z
    .string()
    .trim()
    .min(1, "Download limit cannot be empty")
    .optional(),
});

/**
 * Runtime validation schema for OLT GPON/EPON provisioning settings.
 */
export const oltSchema = z.object({
  vendor: z.enum(["vsol", "zte", "generic"]).optional(),
  pon_ports: z
    .array(z.number().int("PON port must be an integer").min(1))
    .optional(),
  dba_profiles: z.array(oltDbaProfileSchema).optional(),
  ont_profiles: z.array(oltOntProfileSchema).optional(),
});

/**
 * Root Zod schema for NetForge network configuration data.
 */
export const networkDataSchema = z.object({
  device: deviceSchema,
  vlans: z.array(vlanSchema),
  interfaces: interfaceSchema,
  ip_pools: z.array(ipPoolSchema).optional(),
  pppoe: pppoeSchema.optional(),
  olt: oltSchema.optional(),
});

/**
 * Error thrown when network configuration data fails schema validation.
 */
export class NetworkValidationError extends Error {
  public readonly issues: string[];

  constructor(issues: string[]) {
    super(
      `Network configuration validation failed:\n${issues.map((issue) => `  - ${issue}`).join("\n")}`
    );
    this.name = "NetworkValidationError";
    this.issues = issues;
  }
}

/**
 * Validates unknown parsed input against {@link networkDataSchema}.
 * Throws a descriptive {@link NetworkValidationError} when validation fails.
 */
export function validateNetworkData(data: unknown): NetworkData {
  const result = networkDataSchema.safeParse(data);

  if (!result.success) {
    const formattedIssues = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "<root>";
      return `${path}: ${issue.message}`;
    });

    throw new NetworkValidationError(formattedIssues);
  }

  return result.data;
}
