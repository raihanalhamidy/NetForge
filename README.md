# NetForge

**Declarative Multi-Vendor Network Device Config Generator CLI**

[![CI](https://github.com/raihanalhamidy/NetForge/actions/workflows/ci.yml/badge.svg)](https://github.com/raihanalhamidy/NetForge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

---

## Mengapa NetForge?

**Masalah**: Mengonfigurasi banyak switch dan router dari berbagai vendor secara manual lewat CLI sangat rentan terhadap *human error* mulai dari salah ketik VLAN ID, lupa menambahkan interface ke trunk, hingga inkonsistensi subnet mask antar perangkat.

**Solusi**: **NetForge** memisahkan *data topologi* (YAML) dari *sintaks CLI vendor* (template Nunjucks). Data YAML terlebih dahulu divalidasi secara ketat saat runtime menggunakan **Zod** (memastikan rentang VLAN `1–4094`, format IP/CIDR, dan kelengkapan field) sebelum di-render menjadi script konfigurasi siap pakai.

---

## Vendor yang Didukung

| Vendor | Status | Template Tersedia | Output |
| --- | --- | --- | --- |
| **MikroTik RouterOS** | Didukung | `templates/mikrotik/vlan_trunk.njk` | Script `.rsc` / CLI RouterOS (bridge VLAN filtering) |
| **Cisco IOS** | Didukung | `templates/cisco/vlan_access.njk` | Konfigurasi `.cfg` / IOS (VLAN DB, SVI, trunk & access) |
| **Generic / Lainnya** | Ekstensibel | Tambahkan template `.njk` di `templates/<vendor>/` | Menyesuaikan template |

---

## Quick Start & Instalasi

Pastikan **Node.js >= 20** dan **npm** sudah terpasang.

```bash
# 1. Clone repositori
git clone https://github.com/raihanalhamidy/NetForge.git
cd NetForge

# 2. Install dependencies
npm install

# 3. Build project
npm run build
```

---

## Panduan Penggunaan CLI

Gunakan perintah `build` dengan opsi:
- `-t, --template <path>` *(wajib)*: Path ke file template Nunjucks (`.njk`).
- `-d, --data <path>` *(wajib)*: Path ke file variabel konfigurasi YAML.
- `-o, --output <path>` *(opsional)*: Path file output. Jika tidak diisi, hasil dicetak langsung ke terminal.

### 1. Menampilkan hasil ke terminal (MikroTik RouterOS)

```bash
node dist/index.js build -t templates/mikrotik/vlan_trunk.njk -d data/samples/mikrotik_vlan.yaml
```

### 2. Menyimpan hasil ke file konfigurasi (Cisco IOS)

```bash
node dist/index.js build -t templates/cisco/vlan_access.njk -d data/samples/cisco_vlan.yaml -o output/cisco-switch.cfg
```

*(Selama pengembangan tanpa build ulang, Anda juga dapat menjalankan `npm run dev -- build -t ... -d ...`.)*

---

## Contoh Struktur Data Input YAML

```yaml
device:
  hostname: "RB-DIST-01"
  vendor: "mikrotik" # mikrotik | cisco | generic
  mgmt_ip: "192.168.88.2/24"
  gateway: "192.168.88.1"

vlans:
  - id: 10
    name: "Management"
    description: "Management Network"
  - id: 20
    name: "Hotspot"
    description: "Hotspot Client Network"

interfaces:
  trunk:
    - "ether1"
    - "ether2"
  access:
    - name: "ether3"
      vlan_id: 20
```

---

## Struktur Proyek

```text
NetForge/
├── .github/
│   ├── ISSUE_TEMPLATE/        # Template bug report & request template vendor
│   ├── workflows/ci.yml       # Pipeline CI GitHub Actions
│   └── PULL_REQUEST_TEMPLATE.md
├── data/samples/              # Contoh data input YAML MikroTik & Cisco
├── src/
│   ├── commands/              # Handler command CLI (build)
│   ├── core/                  # Validator Zod, Parser YAML, Renderer Nunjucks
│   ├── types/                 # Definisi tipe TypeScript
│   └── index.ts               # Entry point CLI Commander
├── templates/
│   ├── mikrotik/              # Template MikroTik RouterOS
│   └── cisco/                 # Template Cisco IOS
└── tests/                     # Unit test Vitest
```

---

## Menjalankan Pengujian

```bash
npm run lint   # Cek tipe TypeScript (tsc --noEmit)
npm test       # Jalankan unit test Vitest
npm run build  # Build bundle ESM & deklarasi tipe (tsup)
```

---

## Contributing

Kontribusi sangat terbuka—terutama untuk penambahan template vendor jaringan baru! Silakan baca [CONTRIBUTING.md](CONTRIBUTING.md) untuk panduan struktur template, daftar variabel Nunjucks yang tersedia, dan aturan Pull Request.

---

## Lisensi

Proyek ini dirilis di bawah lisensi [MIT](LICENSE).

