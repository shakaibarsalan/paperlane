import { notFound, redirect } from "next/navigation";
import { DocEditor } from "@/components/DocEditor";
import { getDocument } from "@/lib/documents";
import { AppError } from "@/lib/errors";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  try {
    const doc = await getDocument(user.id, id);
    return <DocEditor doc={doc} user={user} />;
  } catch (err) {
    if (err instanceof AppError && err.status === 404) notFound();
    throw err;
  }
}
