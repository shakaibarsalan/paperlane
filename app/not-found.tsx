import Link from "next/link";

export default function NotFound() {
  return (
    <main className="login">
      <div className="login-card">
        <h1 style={{ margin: "0 0 6px", fontSize: 22 }}>Document not found</h1>
        <p className="lead">It may have been deleted, or it hasn&apos;t been shared with this account.</p>
        <Link className="btn btn-primary" href="/">
          Back to documents
        </Link>
      </div>
    </main>
  );
}
