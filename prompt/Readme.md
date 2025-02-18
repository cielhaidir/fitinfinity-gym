# Tutorial Menggunakan Folder Prompt

Folder `prompt` ini digunakan untuk menyimpan semua template yang akan digunakan berulang kali. Misalnya, jika Anda ingin membuat operasi CRUD, Anda dapat menggunakan template yang ada di folder ini. Berikut adalah langkah-langkah untuk menggunakan folder `prompt`:

## Langkah 1: Menyiapkan Folder Prompt
Pastikan folder `prompt` sudah ada di dalam direktori proyek Anda. Jika belum, buat folder tersebut:
```bash
mkdir -p /Users/mm/Work/Developer/fitinfinity/prompt
```

## Langkah 2: Menyimpan Template
Simpan semua template yang Anda butuhkan di dalam folder `prompt`. Misalnya, buat file template untuk operasi CRUD:
```bash
touch /Users/mm/Work/Developer/fitinfinity/prompt/crud_template.md
```

## Langkah 3: Menggunakan Template
Untuk menggunakan template yang sudah disimpan, sisa pakai di copilot chat lalu referensikan file promptnya

## Contoh Isi Template CRUD
Berikut adalah contoh isi dari `crud_template.md`:
```markdown
# CRUD Template

## Create
- [ ] Implementasi fungsi create
- [ ] Validasi input data

## Read
- [ ] Implementasi fungsi read
- [ ] Menampilkan data

## Update
- [ ] Implementasi fungsi update
- [ ] Validasi data yang akan diupdate

## Delete
- [ ] Implementasi fungsi delete
- [ ] Konfirmasi sebelum menghapus data
```

Dengan mengikuti langkah-langkah di atas, Anda dapat dengan mudah menggunakan template yang ada di folder `prompt` untuk mempercepat proses pengembangan.
