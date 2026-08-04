import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Saniterér filnavnet så det ikke kan injicere i HTTP-headeren (fjern CR/LF, quotes,
// backslash og styretegn). Den originale (UTF-8) titel bevares via filename*.
function asciiSafe(name: string): string {
  const cleaned = name.replace(/[\r\n"\\]/g, "_").replace(/[^\x20-\x7E]/g, "_").trim();
  return cleaned || "download";
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const att = await prisma.attachment.findUnique({
    where: { id },
    select: { name: true, mime: true, size: true, data: true },
  });
  if (!att || !att.data) return new Response("Not found", { status: 404 });

  const bytes = new Uint8Array(att.data);
  const safe = asciiSafe(att.name);
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": att.mime || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(att.name)}`,
      "Content-Length": String(att.size ?? bytes.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
