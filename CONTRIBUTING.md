# Panduan Kontribusi NetForge

Terima kasih telah tertarik berkontribusi pada **NetForge**! Proyek ini dirancang modular agar siapa pun dapat menambahkan template perangkat jaringan baru dengan mudah tanpa harus mengubah *core* TypeScript engine.

---

## 1. Menambahkan Template Vendor Baru (Tanpa Mengubah Core Engine)

Anda dapat langsung menyumbangkan template konfigurasi baru hanya dengan menambahkan file Nunjucks (`.njk`) di folder `templates/`:

1. Buat subdirektori vendor (jika belum ada) di dalam folder `templates/`, misalnya:
   ```text
   templates/<nama-vendor>/<nama-skenario>.njk
   ```
   Contoh: `templates/arista/vlan_trunk.njk` atau `templates/mikrotik/ospf_basic.njk`.

2. Pada file YAML data input, field `device.vendor` saat ini mendukung nilai `"mikrotik"`, `"cisco"`, atau `"generic"`. Untuk vendor baru yang belum terdaftar secara khusus, gunakan:
   ```yaml
   device:
     hostname: "SW-NEW-01"
     vendor: "generic"
     mgmt_ip: "10.20.30.2/24"
   ```
   Dengan begitu, validator dan renderer tetap berjalan normal tanpa perlu menyentuh kode TypeScript di `src/`.

3. Sertakan juga contoh file YAML uji coba di `data/samples/` (opsional namun sangat dianjurkan) agar reviewer dapat langsung menguji template Anda.

---

## 2. Aturan Penamaan File & Variabel Nunjucks

### Penamaan File Template
- Gunakan huruf kecil dan *snake_case*, diakhiri ekstensi `.njk`.
- Contoh yang baik: `vlan_trunk.njk`, `vlan_access.njk`, `basic_mgmt.njk`.

### Variabel Data yang Tersedia
Semua template menerima objek `NetworkData` hasil validasi Zod dengan struktur berikut:

| Variabel | Tipe | Wajib | Keterangan |
| --- | --- | --- | --- |
| `device.hostname` | `string` | Ya | Nama host perangkat |
| `device.vendor` | `"mikrotik" \| "cisco" \| "generic"` | Ya | Identifier vendor |
| `device.mgmt_ip` | `string` | Ya | IP manajemen format IPv4/CIDR (mis. `192.168.88.2/24`) |
| `device.gateway` | `string` | Tidak | IPv4 default gateway (mis. `192.168.88.1`) |
| `vlans` | `Array` | Ya | Daftar VLAN (`id`, `name`, `description?`) |
| `interfaces.trunk` | `string[]` | Ya | Daftar nama interface trunk |
| `interfaces.access` | `Array` | Tidak | Daftar interface access (`name`, `vlan_id`) |

### Filter Bawaan Renderer
NetForge menyediakan filter Nunjucks tambahan yang bisa langsung dipakai di template:
- `ip_only`: Mengambil alamat IP dari format CIDR (`"10.10.10.2/24" | ip_only` → `"10.10.10.2"`).
- `subnet_mask`: Mengonversi prefix CIDR menjadi subnet mask (`"10.10.10.2/24" | subnet_mask` → `"255.255.255.0"`).
- Filter standar Nunjucks seperti `join(",")` juga tersedia.

> **Tips**: Karena `autoescape: false`, `trimBlocks: true`, dan `lstripBlocks: true` aktif di renderer, karakter seperti `"`, `'`, `/`, dan `&` tidak akan di-escape menjadi entitas HTML.

---

## 3. Pengujian Lokal Sebelum Pull Request

Sebelum membuka Pull Request, pastikan seluruh pemeriksaan berikut berjalan tanpa error:

```bash
# 1. Cek tipe TypeScript
npm run lint

# 2. Jalankan seluruh unit test Vitest
npm test

# 3. Pastikan build produksi sukses
npm run build

# 4. Uji langsung rendering template Anda via CLI
node dist/index.js build -t templates/<vendor>/<template>.njk -d data/samples/<sample>.yaml
```

Jika seluruh langkah di atas lulus, silakan buat Pull Request melalui GitHub dan lengkapi checklist pada template PR.

