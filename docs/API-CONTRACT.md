# API Contract — Admin Panel (FE Wiring Guide)

Referensi endpoint backend yang **belum dikonek** ke admin panel FE. Yang sudah terkonek: **Auth (login)**, **Dashboard**, **Products**.

Status prioritas wiring:
1. 🔴 **Categories** — dibutuhkan form Product yang sudah jalan
2. 🔴 **Orders** — transaksi inti (pre-order)
3. 🟡 **Media/Upload** — dipakai form Product & Blog
4. 🟡 **Contacts** — inbox leads
5. 🟡 **Blog**
6. 🟢 **CMS** — konten by key

> **Users** & **Notifications** tidak punya endpoint (internal saja) — tidak perlu diurus FE.

---

## Konvensi umum (berlaku semua endpoint)

- **Base URL:** tanpa prefix. Contoh: `POST /auth/login`, `GET /orders`.
- **Header admin (wajib):** `Authorization: Bearer <access_token>`
- **Swagger:** tersedia di `/docs` untuk cek schema live.
- **Envelope list (semua endpoint list):**
  ```json
  { "items": [ ... ], "meta": { "total": 42, "page": 1, "limit": 12, "total_pages": 4 } }
  ```
- **Query pagination (semua list):** `?page=1&limit=25`.
  - **Default `limit` per konteks** (kalau FE **tidak** kirim `?limit=`): **admin panel = 25**, **end-user/publik = 10**. `page` default `1`, `limit` max `100`.
  - Boleh override kapan saja dengan `?limit=` eksplisit (mis. `?limit=50`) — nilai FE selalu menang.
  - Endpoint yang dipakai admin **dan** publik (products, news, faqs): backend otomatis pilih 25 kalau ada `Authorization: Bearer`, 10 kalau anonim. FE tetap boleh kirim `?limit=` sendiri.
- **⚠️ Strict body validation (penyebab umum "update gagal"):** semua endpoint pakai `whitelist + forbidNonWhitelisted`. Artinya kalau body PATCH/POST memuat **field yang tidak ada di kontrak** (mis. FE mengirim balik seluruh objek detail: `id`, `slug`, `category`, `created_at`, `view_count`, dst), backend menolak **seluruh** request dengan **400** dan pesan seperti `property xxx should not exist`. **Kirim hanya field yang mau diubah** — lihat body yang tercantum di tiap endpoint.
- **Bulk delete (pola sama di products/orders/contacts/blogs):**
  - Body: `{ "ids": ["uuid-v4", "..."] }` → Response: `{ "deleted": 3 }`
- **`id` di semua response = UUID v4** (bukan angka DB). Semua `:uuid` di path pakai UUID ini.
- **Role:** `ADMIN` dan `SUPERADMIN` bisa akses endpoint admin, kecuali yang ditandai **SUPERADMIN** (delete tertentu).

---

## 0. Auth & Sesi (WAJIB dibaca — penyebab "tiba-tiba logout")

Login memberi **dua token**:

```json
POST /auth/login  { "email": "...", "password": "..." }
→ { "access_token": "...", "refresh_token": "...", "user": { "id","email","name","role" } }
```

- **`access_token`** — dipakai di header `Authorization: Bearer <access_token>` untuk semua request admin. **Masa hidup 1 jam.**
- **`refresh_token`** — hanya untuk minta access_token baru. **Masa hidup 30 hari.**

**Kenapa admin sering ter-logout saat masih aktif?** Karena `access_token` kedaluwarsa (dulu 15 menit, sekarang 1 jam) dan FE **tidak memperbaruinya**. Begitu access_token expired, request balas **401** → FE menendang user ke login. Sesi 30 hari itu percuma kalau FE tidak refresh.

**Yang FE WAJIB lakukan — silent refresh:**
1. Simpan `access_token` **dan** `refresh_token` saat login.
2. Pasang interceptor: kalau ada response **401** (dan bukan dari `/auth/login`), panggil:
   ```json
   POST /auth/refresh  { "refresh_token": "<refresh_token>" }
   → { "access_token": "<access_token baru>" }
   ```
   lalu **ulangi request yang gagal tadi** dengan access_token baru. User tidak perlu tahu apa-apa.
3. Baru **logout / lempar ke halaman login** kalau `POST /auth/refresh` juga balas **401** (berarti refresh_token benar-benar habis / dicabut).

> Catatan: `POST /auth/refresh` mengembalikan **hanya `access_token`** (refresh_token tetap dipakai yang lama sampai 30 hari). Endpoint ini `Public` (tidak butuh Bearer), token dibaca dari **body**.
> `POST /auth/logout` (butuh Bearer) mencabut refresh_token di server.
> Login ulang menimpa refresh_token lama — jadi login di device/tab baru bisa membuat sesi lama tidak bisa di-refresh lagi (by design).

---

## 1. Categories 🔴

| Method | Path | Role | Body |
|---|---|---|---|
| GET | `/categories` | Public | — |
| POST | `/categories` | ADMIN | `{ "name": "Sparepart" }` |
| PATCH | `/categories/:uuid` | ADMIN | `{ "name": "..." }` |
| DELETE | `/categories/:uuid` | **SUPERADMIN** | — |

- `name`: string, 2–120 char. `slug` di-generate otomatis dari `name`.
- **GET** mengembalikan **array langsung** (bukan paginated):
  ```json
  [ { "id": "uuid", "name": "Sparepart", "slug": "sparepart" } ]
  ```
- POST/PATCH mengembalikan 1 objek `{ id, name, slug }`.

> **⚠️ Ngedit nama kategori (PATCH /categories/:uuid) — body HANYA `{ "name": "..." }`.**
> Jangan sertakan `id` / `slug` di body → kena 400 `property slug should not exist`. `slug` otomatis ikut berubah di server.

**Mengubah kategori sebuah PRODUK** (bukan endpoint ini — pakai `PATCH /products/:uuid`):
- Kirim field **`category_id`** berisi **UUID kategori** (nilai `id` dari `GET /categories`), **bukan** nama kategori.
  ```json
  { "category_id": "8f3c...uuid-kategori" }
  ```
- Salah umum: mengirim `{ "category": "Sparepart" }` (nama) atau ikut mengirim field lain dari detail produk (`slug`, `view_count`, dll) → 400, kategori tidak berubah. Kirim hanya field yang diubah.

---

## 2. Orders (Pre-order) 🔴

| Method | Path | Role | Catatan |
|---|---|---|---|
| GET | `/orders?page=&limit=&status=` | ADMIN | filter `status` opsional |
| GET | `/orders/:uuid` | ADMIN | detail |
| PATCH | `/orders/:uuid` | ADMIN | ubah status |
| POST | `/orders/bulk/delete` | ADMIN | `{ "ids": [] }` |
| DELETE | `/orders/:uuid` | **SUPERADMIN** | — |
| POST | `/orders` | Public | submit dari web publik (bukan admin) |

- **`status` enum:** `NEW` \| `PROCESSED` \| `DONE` \| `CANCELLED`
- **PATCH body:** `{ "status": "PROCESSED" }`
- **Response order:**
  ```json
  {
    "id": "uuid",
    "customer_name": "Budi",
    "phone": "0812...",
    "email": "budi@mail.com | null",
    "vehicle_model": "Vario 160 | null",
    "note": "string | null",
    "status": "NEW",
    "created_at": "2026-07-08T10:00:00.000Z",
    "items": [
      { "product_slug": "charger-7kw", "product_name": "Charger 7kW", "price_snapshot": "1500000.00", "quantity": 2 }
    ]
  }
  ```
- `price_snapshot` = string desimal (snapshot harga saat order dibuat).
- List = envelope paginated berisi objek order di atas.

**POST /orders (public — referensi form web publik):**
```json
{
  "customer_name": "Budi",
  "phone": "0812...",
  "email": "budi@mail.com (opsional)",
  "vehicle_model": "Vario 160 (opsional)",
  "note": "catatan (opsional, max 2000)",
  "items": [ { "product_slug": "charger-7kw", "quantity": 2 } ]
}
```
→ Response: `{ "id": "uuid", "created_at": "..." }`

---

## 3. Contacts (Leads) 🟡

| Method | Path | Role | Catatan |
|---|---|---|---|
| GET | `/contacts?page=&limit=&status=` | ADMIN | filter `status` opsional |
| GET | `/contacts/:uuid` | ADMIN | detail |
| PATCH | `/contacts/:uuid` | ADMIN | ubah status |
| POST | `/contacts/bulk/delete` | ADMIN | `{ "ids": [] }` |
| DELETE | `/contacts/:uuid` | ADMIN | — |
| POST | `/contacts` | Public | form kontak web publik |

- **`status` enum:** `NEW` \| `CONTACTED` \| `CLOSED`
- **PATCH body:** `{ "status": "CONTACTED" }`
- **Response:**
  ```json
  {
    "id": "uuid", "name": "Budi", "phone": "0812...", "email": "budi@mail.com",
    "vehicle_model": "Vario | null", "message": "Tanya stok...",
    "status": "NEW", "created_at": "2026-07-08T..."
  }
  ```

---

## 4. Media / Upload 🟡 *(dipakai form Product & Blog)*

Alur **2 langkah**: upload dulu → dapat `id` (uuid) → pakai uuid itu di payload create/update product/blog.

| Method | Path | Role | Body |
|---|---|---|---|
| POST | `/media/upload` | ADMIN | `multipart/form-data`, field **`file`** (1 file) |
| POST | `/media/upload-many` | ADMIN | `multipart/form-data`, field **`files`** (array, max 20) |
| DELETE | `/media/:uuid` | ADMIN | → 204 No Content |

- **Allowed types:** image `jpeg/png/webp/avif` atau `application/pdf`. Max size default **10 MB**.
- **Response upload (single):**
  ```json
  { "id": "uuid", "url": "https://.../file.webp", "filename": "file.webp",
    "mime_type": "image/webp", "size_bytes": 12345, "width": 800, "height": 600 }
  ```
- `upload-many` → **array** dari objek di atas.

---

## 5. Blog 🟡

| Method | Path | Role | Catatan |
|---|---|---|---|
| GET | `/blogs?page=&limit=&category=` | Public | list published |
| GET | `/blogs/slug/:slug` | Public | detail publik |
| GET | `/blogs/:uuid` | ADMIN | detail admin (termasuk draft) |
| POST | `/blogs` | ADMIN | create |
| PATCH | `/blogs/:uuid` | ADMIN | update (partial) |
| DELETE | `/blogs/:uuid` | ADMIN | soft delete |
| POST | `/blogs/bulk/delete` | ADMIN | `{ "ids": [] }` |

- **`category`** (kirim Title-case): `"Tips"` \| `"Rilis"` \| `"Panduan"` \| `"Berita"`
- **POST body:**
  ```json
  {
    "title": "Judul (3-255)",
    "category": "Tips",
    "excerpt": "ringkasan (10-500)",
    "content_html": "<p>Tiptap HTML</p>",
    "cover_uuid": "uuid-media (opsional)",
    "author": "Nama (2-191)",
    "reading_minutes": 5,
    "is_published": true,
    "published_at": "2026-06-28T00:00:00.000Z"
  }
  ```
- `content_html` disanitasi server-side (anti-XSS). `cover_uuid` = hasil upload media.
- PATCH = semua field opsional (partial update).
- **Response detail (admin/public detail):**
  ```json
  {
    "slug": "judul", "title": "...", "category": "Tips", "excerpt": "...",
    "image_url": "https://... | null", "published_at": "2026-06-28",
    "reading_minutes": 5, "content_html": "<p>...</p>", "author": "Nama"
  }
  ```
- `published_at` di response = tanggal `YYYY-MM-DD`.
- List publik pakai `BlogCard` (tanpa `content_html` & `author`).

---

## 6. CMS 🟢 *(konten by key)*

| Method | Path | Role | Body |
|---|---|---|---|
| GET | `/cms/:key` | Public | — |
| PUT | `/cms/:key` | ADMIN | `{ "data": { ...bebas } }` |
| PATCH | `/cms/:key` | ADMIN | `{ "data": { ...bebas } }` |

- PUT & PATCH identik (upsert — buat kalau belum ada). `data` = objek JSON bebas.
- **Response:** `{ "key": "hero", "data": { ... } }`
- GET key yang belum ada → **404**.

---

## Ringkasan status wiring

| Modul | Status | Prioritas |
|---|---|---|
| Auth (login) | ✅ Terkonek | — |
| Dashboard | ✅ Terkonek | — |
| Products | ✅ Terkonek | — |
| Categories | ⏳ Belum | 🔴 Tinggi |
| Orders | ⏳ Belum | 🔴 Tinggi |
| Media/Upload | ⏳ Belum | 🟡 Sedang |
| Contacts | ⏳ Belum | 🟡 Sedang |
| Blog | ⏳ Belum | 🟡 Sedang |
| CMS | ⏳ Belum | 🟢 Rendah |
