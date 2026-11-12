import { listUsers } from "@/lib/documents";
import { json, withUser } from "@/lib/http";

// Directory of seeded users, used by the share dialog's suggestions.
export const GET = withUser(async () => json({ users: await listUsers() }));
