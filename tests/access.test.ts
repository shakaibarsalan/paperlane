import { describe, expect, it } from "vitest";
import { canEdit, canManage, canView, resolveRole } from "@/lib/access";

describe("resolveRole", () => {
  it("makes the owner the owner, whatever share rows exist", () => {
    expect(resolveRole("alice", "alice", null)).toBe("owner");
    expect(resolveRole("alice", "alice", "viewer")).toBe("owner");
  });

  it("gives a shared user exactly their share role", () => {
    expect(resolveRole("alice", "bob", "editor")).toBe("editor");
    expect(resolveRole("alice", "bob", "viewer")).toBe("viewer");
  });

  it("gives everyone else no access", () => {
    expect(resolveRole("alice", "carol", null)).toBeNull();
    expect(resolveRole("alice", "carol", undefined)).toBeNull();
  });
});

describe("permissions", () => {
  it("lets only owners and editors edit", () => {
    expect([canEdit("owner"), canEdit("editor"), canEdit("viewer"), canEdit(null)]).toEqual([true, true, false, false]);
  });

  it("lets anyone with a role view", () => {
    expect([canView("owner"), canView("editor"), canView("viewer"), canView(null)]).toEqual([true, true, true, false]);
  });

  it("lets only the owner manage sharing and deletion", () => {
    expect([canManage("owner"), canManage("editor"), canManage("viewer"), canManage(null)]).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });
});
