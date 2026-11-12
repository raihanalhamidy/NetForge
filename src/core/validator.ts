import { z } from "zod";
import type { NetworkData } from "../types/config.js";

const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;

const IPV4_CIDR_REGEX =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\/(?:3[0-2]|[12]?\d)$/;

/**
 * Runtime validation schema for a single VLAN entry.
 */
export const vlanSchema = z.object({
  id: z
    .number()
    .int("VLAN ID must be an integer")
    .min(1, "VLAN ID must be at least 1")
    .max(4094, "VLAN ID must be at most 4094"),
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
 * Root Zod schema for NetForge network configuration data.
 */
export const networkDataSchema = z.object({
  device: deviceSchema,
  vlans: z.array(vlanSchema),
  interfaces: interfaceSchema,
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

