import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { loadAppData } from "@/lib/data";
import App from "@/components/App";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { task } = await searchParams;
  const data = await loadAppData(session.user.id);
  return <App data={data} initialTaskId={task ?? null} />;
}
