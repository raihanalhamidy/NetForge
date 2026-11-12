import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  outro,
  select,
  text,
} from "@clack/prompts";
import pc from "picocolors";
import YAML from "yaml";
import {
  deviceSchema,
  validateNetworkData,
  vlanSchema,
} from "../core/validator.js";
import type {
  AccessInterfaceConfig,
  VendorType,
  VlanConfig,
} from "../types/config.js";

/**
 * CLI options accepted by the `netforge init` command.
 */
export interface InitCommandOptions {
  output?: string;
}

function abortIfCancelled<T>(value: T): Exclude<T, symbol> {
  if (isCancel(value)) {
    cancel("Setup interaktif dibatalkan oleh pengguna.");
    process.exit(0);
  }
  return value as Exclude<T, symbol>;
}

function splitCommaList(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function getSuggestedTemplate(vendor: VendorType): string {
  switch (vendor) {
    case "mikrotik":
      return "templates/mikrotik/vlan_trunk.njk";
    case "cisco":
      return "templates/cisco/vlan_access.njk";
    case "generic":
      return "templates/<vendor>/<template>.njk";
  }
}

/**
 * Runs the interactive setup wizard (`netforge init`) to collect network
 * topology variables, validate them with Zod, and save a YAML config file.
 */
export async function handleInitCommand(
  options: InitCommandOptions
): Promise<void> {
  const outputPath = options.output ?? "./netforge-config.yaml";

  intro(pc.bgCyan(pc.black(" ⚡ NetForge Interactive Setup Wizard ")));

  try {
    const hostname = abortIfCancelled(
      await text({
        message: "Masukkan hostname perangkat:",
        placeholder: "SW-CORE-01",
        defaultValue: "SW-CORE-01",
        validate(value) {
          const result = deviceSchema.shape.hostname.safeParse(value ?? "");
          if (!result.success) {
            return result.error.issues[0]?.message ?? "Hostname tidak valid";
          }
          return undefined;
        },
      })
    ).trim();

    const vendor = abortIfCancelled(
      await select<VendorType>({
        message: "Pilih vendor perangkat jaringan:",
        options: [
          {
            value: "mikrotik",
            label: "MikroTik RouterOS",
            hint: "Router / Switch RouterOS (.rsc)",
          },
          {
            value: "cisco",
            label: "Cisco IOS",
            hint: "Switch Catalyst / Router IOS (.cfg)",
          },
          {
            value: "generic",
            label: "Generic",
            hint: "Untuk template vendor kustom",
          },
        ],
      })
    );

    const mgmtIp = abortIfCancelled(
      await text({
        message: "Masukkan Management IP (format IPv4/CIDR):",
        placeholder: "192.168.88.2/24",
        defaultValue: "192.168.88.2/24",
        validate(value) {
          const trimmed = (value ?? "").trim();
          const result = deviceSchema.shape.mgmt_ip.safeParse(trimmed);
          if (!result.success) {
            return (
              result.error.issues[0]?.message ??
              "Format Management IP tidak valid"
            );
          }
          return undefined;
        },
      })
    ).trim();

    const gatewayRaw = abortIfCancelled(
      await text({
        message: "Masukkan Gateway IP (opsional, tekan Enter untuk melewati):",
        placeholder: "192.168.88.1",
        validate(value) {
          const trimmed = (value ?? "").trim();
          if (trimmed.length === 0) {
            return undefined;
          }
          const result = deviceSchema.shape.gateway.safeParse(trimmed);
          if (!result.success) {
            return (
              result.error.issues[0]?.message ?? "Format Gateway IP tidak valid"
            );
          }
          return undefined;
        },
      })
    ).trim();

    const vlans: VlanConfig[] = [];
    let addMoreVlans = true;

    while (addMoreVlans) {
      const vlanIdStr = abortIfCancelled(
        await text({
          message: `Masukkan VLAN ID #${vlans.length + 1} (1-4094):`,
          placeholder: vlans.length === 0 ? "10" : "20",
          defaultValue: vlans.length === 0 ? "10" : undefined,
          validate(value) {
            const trimmed = (value ?? "").trim();
            if (trimmed.length === 0) {
              return "VLAN ID wajib diisi";
            }
            const parsed = Number(trimmed);
            const result = vlanSchema.shape.id.safeParse(parsed);
            if (!result.success) {
              return (
                result.error.issues[0]?.message ?? "VLAN ID harus 1-4094"
              );
            }
            if (vlans.some((v) => v.id === parsed)) {
              return `VLAN ID ${parsed} sudah ditambahkan`;
            }
            return undefined;
          },
        })
      ).trim();

      const vlanName = abortIfCancelled(
        await text({
          message: `Masukkan nama untuk VLAN ${vlanIdStr}:`,
          placeholder: vlans.length === 0 ? "Management" : "Staff",
          defaultValue: vlans.length === 0 ? "Management" : undefined,
          validate(value) {
            const result = vlanSchema.shape.name.safeParse(value ?? "");
            if (!result.success) {
              return (
                result.error.issues[0]?.message ??
                "Nama VLAN tidak boleh kosong"
              );
            }
            return undefined;
          },
        })
      ).trim();

      const vlanDescription = abortIfCancelled(
        await text({
          message: `Deskripsi untuk VLAN ${vlanIdStr} (opsional, Enter untuk melewati):`,
          placeholder: "Management Network",
        })
      ).trim();

      vlans.push({
        id: Number(vlanIdStr),
        name: vlanName,
        ...(vlanDescription.length > 0 ? { description: vlanDescription } : {}),
      });

      addMoreVlans = abortIfCancelled(
        await confirm({
          message: "Tambah VLAN lagi?",
          initialValue: false,
        })
      );
    }

    const defaultTrunk =
      vendor === "cisco" ? "GigabitEthernet0/1" : "ether1, ether2";
    const trunkInput = abortIfCancelled(
      await text({
        message: "Masukkan daftar Trunk Port (pisahkan dengan koma):",
        placeholder: defaultTrunk,
        defaultValue: defaultTrunk,
        validate(value) {
          const ports = splitCommaList(value ?? "");
          if (ports.length === 0) {
            return "Minimal satu interface trunk harus diisi";
          }
          return undefined;
        },
      })
    );
    const trunkPorts = splitCommaList(trunkInput);

    const accessPorts: AccessInterfaceConfig[] = [];
    let addAccess = abortIfCancelled(
      await confirm({
        message: "Ingin menambahkan Access Port (opsional)?",
        initialValue: false,
      })
    );

    while (addAccess) {
      const accessName = abortIfCancelled(
        await text({
          message: `Nama interface access #${accessPorts.length + 1}:`,
          placeholder: vendor === "cisco" ? "GigabitEthernet0/2" : "ether3",
          validate(value) {
            if ((value ?? "").trim().length === 0) {
              return "Nama interface access tidak boleh kosong";
            }
            return undefined;
          },
        })
      ).trim();

      const accessVlanId = abortIfCancelled(
        await select<number>({
          message: `Pilih VLAN untuk ${accessName}:`,
          options: vlans.map((vlan) => ({
            value: vlan.id,
            label: `VLAN ${vlan.id} - ${vlan.name}`,
          })),
        })
      );

      accessPorts.push({ name: accessName, vlan_id: accessVlanId });

      addAccess = abortIfCancelled(
        await confirm({
          message: "Tambah Access Port lagi?",
          initialValue: false,
        })
      );
    }

    const rawConfig = {
      device: {
        hostname,
        vendor,
        mgmt_ip: mgmtIp,
        ...(gatewayRaw.length > 0 ? { gateway: gatewayRaw } : {}),
      },
      vlans,
      interfaces: {
        trunk: trunkPorts,
        ...(accessPorts.length > 0 ? { access: accessPorts } : {}),
      },
    };

    const validatedConfig = validateNetworkData(rawConfig);
    const yamlContent = YAML.stringify(validatedConfig);

    const resolvedOutput = path.resolve(outputPath);
    await mkdir(path.dirname(resolvedOutput), { recursive: true });
    await writeFile(resolvedOutput, yamlContent, "utf-8");

    const suggestedTemplate = getSuggestedTemplate(validatedConfig.device.vendor);
    outro(
      `${pc.green(`✔ Konfigurasi berhasil disimpan ke: ${pc.bold(outputPath)}`)}\n` +
        pc.dim(
          `Sekarang jalankan:\n  netforge build -t ${suggestedTemplate} -d ${outputPath}`
        )
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi error yang tidak diketahui.";
    cancel(pc.red(`✖ ${message}`));
    process.exit(1);
  }
}
