📌 Implementasi OCR & AI Model Integration - Next.js + tRPC Fullstack

✅ Phase 1: OCR & Mapping ke tracking_user

🎯 Tujuan

Membaca hasil cetak timbangan (dari beberapa foto), lakukan OCR secara otomatis dari multi-image upload, gabungkan hasil teks, lakukan parsing lengkap ke dalam 4 kategori utama (Composition, Segment, Obesity, Suggestion), lalu tampilkan hasilnya dalam form input yang bisa diedit sebelum disimpan ke tabel tracking_user.

🔧 Teknologi yang Digunakan

Frontend: Next.js (React)

Backend: tRPC (API Routes)

OCR Engine: tesseract.js (di sisi server atau bisa offload via API)

Database: Prisma / PostgreSQL (diasumsikan)

📁 Struktur File

/src
├─ /server
│   ├─ /routers
│   │   └─ tracking.ts         ← endpoint tRPC
│   └─ /utils
│       └─ ocrParser.ts        ← fungsi parsing hasil OCR
├─ /lib
│   └─ ocrClient.ts            ← wrapper OCR client (lokal / API)
├─ /components
│   └─ OCRUploadAndEditForm.tsx ← upload multiple image + preview + form input hasil OCR

📌 Langkah Implementasi

1. Komponen OCRUploadAndEditForm.tsx

Upload gambar file (multiple image input)

Kirim file ke tRPC /tracking.extractOCR

Gabungkan teks dari semua gambar, parsing ke 4 kategori:

Composition: berat, lemak, air, otot, tulang, dll

Segment: distribusi otot dan lemak per bagian tubuh

Obesity: BMI, WHR, BMR, VFA, status obesitas

Suggestion: body type, ideal weight, rekomendasi diet

Tampilkan hasil ke dalam form input yang bisa diedit manual

Submit form ke /tracking.saveTracking

2. Endpoint tRPC: extractOCR

.extractOCR: procedure
  .input(z.object({ files: z.array(z.string().base64()) }))
  .mutation(async ({ input }) => {
    const allText: string[] = [];
    for (const file of input.files) {
      const text = await runOCR(file);
      allText.push(text);
    }

    const fullOCRText = allText.join("\n");
    const parsedData = parseOCRText(fullOCRText);

    return {
      raw_text: fullOCRText,
      parsed: parsedData
    };
  });

3. Endpoint tRPC: saveTracking

.saveTracking: procedure
  .input(z.object({
    userId: z.string(),
    composition: z.any(),
    segment: z.any(),
    obesity: z.any(),
    suggestion: z.any(),
    raw_text: z.string()
  }))
  .mutation(async ({ input, ctx }) => {
    await ctx.db.tracking_user.create({
      data: {
        userId: input.userId,
        composition: input.composition,
        segment: input.segment,
        obesity: input.obesity,
        suggestion: input.suggestion,
        raw_text: input.raw_text,
        createdAt: new Date()
      }
    });
    return { success: true };
  });

4. ocrParser.ts

Fungsi parseOCRText() harus mengenali bagian teks berdasarkan header seperti:

"Compositions"

"Segments"

"Obesity"

"Suggestions"

Gunakan regex untuk mengekstrak nilai dari setiap bagian

Output return-nya:

{
  composition: { weight, fat, muscle, ... },
  segment: { left_leg_muscle, trunk_fat, ... },
  obesity: { bmi, fat_rate, bmr, ... },
  suggestion: { body_type, dci, ideal_weight, ... }
}

5. Form Editable di Frontend

Form dibagi menjadi 4 fieldset:

<fieldset>
  <legend>Composition</legend>
  <Input name="weight" defaultValue={parsed.composition.weight} />
  <Input name="muscle" defaultValue={parsed.composition.muscle} />
  ...
</fieldset>
<fieldset>
  <legend>Segment</legend>
  <Input name="trunk_fat" defaultValue={parsed.segment.trunk_fat} />
  ...
</fieldset>
<fieldset>
  <legend>Obesity</legend>
  <Input name="bmi" defaultValue={parsed.obesity.bmi} />
  ...
</fieldset>
<fieldset>
  <legend>Suggestion</legend>
  <Input name="ideal_weight" defaultValue={parsed.suggestion.ideal_weight} />
  ...
</fieldset>
<Button type="submit">Simpan</Button>

🧠 Phase 2: AI Model Integration

Tujuan:

Melakukan interpretasi hasil OCR lebih lanjut dengan model AI (ex: rekomendasi fitness, deteksi abnormal, saran diet)

Dua Pilihan Arsitektur:

✅ Opsi A - Langsung Hit AI Model dari tRPC

Pro:

Real-time

Kontrol penuh

Kontra:

Membebani server

Tidak scalable saat trafik tinggi

Cara:

const aiResponse = await fetch('http://your-ml-endpoint', {
  method: 'POST',
  body: JSON.stringify(parsedData)
});

🔄 Opsi B - Via n8n Workflow

Pro:

Asynchronous & modular

Bisa tambahkan notifikasi, logging, atau simpan ke tempat lain

Kontra:

Delay, perlu manajemen antrian

Diagram n8n:

[Webhook] ← [HTTP trigger from tRPC]
   ↓
[Call AI model via HTTP]
   ↓
[Save AI result to DB / Notify user]

Saran:

Gunakan Opsi A (direct hit) jika AI model ringan dan kamu ingin realtime

Gunakan Opsi B (n8n) jika ingin fleksibilitas, logging, atau ada antrian (misal banyak user pakai OCR bersamaan)

📦 Checklist Implementasi



Siap digunakan di aplikasi Next.js kamu 💪

