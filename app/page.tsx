import { redirect } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { DocsHome } from "@/components/DocsHome";
import { listDocuments } from "@/lib/documents";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { owned, shared } = await listDocuments(user.id);
  return (
    <>
      <TopBar user={user} />
      <DocsHome owned={owned} shared={shared} />
    </>
  );
}
