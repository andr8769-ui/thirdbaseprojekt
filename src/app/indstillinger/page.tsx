import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { erAdmin } from "@/lib/constants";
import { activeTransport, effectiveFrom } from "@/lib/email";
import SettingsForm from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function IndstillingerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const u = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, role: true, emailNotifications: true },
  });

  return (
    <SettingsForm
      navn={u?.name || ""}
      email={u?.email || ""}
      initial={u?.emailNotifications ?? true}
      isAdmin={erAdmin(u?.role)}
      transport={activeTransport()}
      from={effectiveFrom()}
    />
  );
}
