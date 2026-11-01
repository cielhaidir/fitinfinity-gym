import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile, stat } from "fs/promises";

/**
 * Serve uploaded files from public/assets/ at runtime.
 *
 * Next.js standalone mode only serves files that existed in public/ at build
 * time.  Files uploaded after the build (payment proofs, profile images, etc.)
 * are written to public/assets/* but Next.js won't serve them.
 *
 * This catch-all route bridges that gap:
 *   GET /api/files/assets/class-visit/abc.jpg
 *   → reads  <cwd>/public/assets/class-visit/abc.jpg
 *   → streams it back with the correct Content-Type.
 *
 * Only the whitelisted directories are accessible to prevent path-traversal.
 */

const ALLOWED_PREFIXES = [
  "assets/class-visit",
  "assets/transaction",
  "assets/management/transaction",
  "assets/profile",
  "assets/PT",
  "assets/pt",
  "assets/exercise",
  "uploads",
];

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path;
  const relativePath = segments.join("/");

  // Security: only allow whitelisted prefixes
  const allowed = ALLOWED_PREFIXES.some((prefix) =>
    relativePath.startsWith(prefix),
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Security: block path traversal
  if (relativePath.includes("..")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const absolutePath = path.join(process.cwd(), "public", relativePath);

  // Ensure resolved path is still inside public/
  const publicRoot = path.join(process.cwd(), "public");
  if (!absolutePath.startsWith(publicRoot)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await stat(absolutePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(absolutePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

  const buffer = await readFile(absolutePath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
