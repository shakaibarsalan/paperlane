import { redirect } from "next/navigation";
import { listUsers } from "@/lib/documents";
import { currentUser } from "@/lib/session";
import { LoginOptions } from "./LoginOptions";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentUser()) redirect("/");
  const users = await listUsers();
  return (
    <main className="login">
      <div className="login-card">
        <h1 style={{ margin: "0 0 4px", fontSize: 22 }}>Sign in to Paperlane</h1>
        <p className="lead" style={{ marginBottom: 6 }}>
          This demo uses seeded accounts instead of passwords. Pick a user; switch users from the top bar to test
          sharing.
        </p>
        <LoginOptions users={users} />
      </div>
    </main>
  );
}
