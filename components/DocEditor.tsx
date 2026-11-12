"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { Doc, User } from "@/lib/documents";
import { TopBar } from "./TopBar";
import { SharePanel } from "./SharePanel";

type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

const SAVE_DELAY_MS = 800;

export function DocEditor({ doc, user }: { doc: Doc; user: User }) {
  const editable = doc.role === "owner" || doc.role === "editor";
  const [title, setTitle] = useState(doc.title);
  const [state, setState] = useState<SaveState>("saved");
  const [errorText, setErrorText] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const closeShare = useCallback(() => setShareOpen(false), []);

  // Refs hold the save bookkeeping so the debounce never reads stale state.
  const version = useRef(doc.version);
  const dirty = useRef({ title: false, content: false });
  const changeSeq = useRef(0);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(doc.title);
  const editorRef = useRef<Editor | null>(null);
  const blocked = useRef(false); // set after a conflict or permission error

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    if (blocked.current || inFlight.current) return;
    const d = dirty.current;
    if (!d.title && !d.content) return;

    const trimmedTitle = titleRef.current.trim();
    if (d.title && !trimmedTitle) {
      setState("error");
      setErrorText("Title can't be empty");
      return;
    }

    const body: { version: number; title?: string; contentHtml?: string } = { version: version.current };
    if (d.title) body.title = trimmedTitle;
    if (d.content && editorRef.current) body.contentHtml = editorRef.current.getHTML();

    const seqAtSend = changeSeq.current;
    inFlight.current = true;
    setState("saving");
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409 || res.status === 403 || res.status === 404) {
        blocked.current = true;
        setState("conflict");
        setErrorText(data.error ?? "This document can no longer be saved. Reload the page.");
        return;
      }
      if (!res.ok) {
        setState("error");
        setErrorText(data.error ?? "Couldn't save. Retrying when you keep typing.");
        return;
      }
      version.current = data.version;
      if (changeSeq.current === seqAtSend) {
        dirty.current = { title: false, content: false };
        setState("saved");
        setErrorText("");
      } else {
        // More edits arrived while this save was in flight; save again.
        timer.current = setTimeout(save, SAVE_DELAY_MS);
      }
    } catch {
      setState("error");
      setErrorText("You're offline or the server is unreachable. Changes are kept in this tab.");
    } finally {
      inFlight.current = false;
    }
  }, [doc.id]);

  const scheduleSave = useCallback(
    (what: "title" | "content") => {
      if (blocked.current) return;
      dirty.current[what] = true;
      changeSeq.current += 1;
      setState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(save, SAVE_DELAY_MS);
    },
    [save],
  );

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false } })],
    content: doc.contentHtml,
    editable,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { "aria-label": "Document body", spellcheck: "true" } },
    onUpdate: () => scheduleSave("content"),
  });
  editorRef.current = editor;

  // Warn before leaving with unsaved changes; Ctrl/Cmd+S saves immediately.
  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.title || dirty.current.content) e.preventDefault();
    };
    const keydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("keydown", keydown);
    };
  }, [save]);

  const stateLabel: Record<SaveState, string> = {
    saved: "All changes saved",
    dirty: "Unsaved changes",
    saving: "Saving…",
    error: "Not saved",
    conflict: "Not saved",
  };

  return (
    <>
      <TopBar user={user} />
      <div className="editor-bar">
        <Link href="/" className="btn btn-small" aria-label="Back to documents">
          ← Docs
        </Link>
        <input
          className="title-input"
          value={title}
          maxLength={200}
          disabled={!editable}
          aria-label="Document title"
          onChange={(e) => {
            setTitle(e.target.value);
            titleRef.current = e.target.value;
            scheduleSave("title");
          }}
          onBlur={() => save()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              editor?.commands.focus();
            }
          }}
        />
        {editable ? (
          <span className={`save-state ${state === "error" || state === "conflict" ? "error" : ""}`} aria-live="polite">
            {stateLabel[state]}
          </span>
        ) : (
          <span className="readonly-note">View only · shared by {doc.owner.name}</span>
        )}
        {doc.role === "editor" && <span className="readonly-note">Shared by {doc.owner.name}</span>}
        <a className="btn btn-small" href={`/api/documents/${doc.id}/export`}>
          Export .md
        </a>
        {doc.role === "owner" && (
          <button className="btn btn-small btn-primary" onClick={() => setShareOpen(true)}>
            Share
          </button>
        )}
      </div>

      {editable && editor && <Toolbar editor={editor} />}

      <div className="paper-wrap">
        {errorText && (
          <div className="alert alert-error" role="alert" style={{ maxWidth: 816, margin: "0 auto 16px" }}>
            <span>{errorText}</span>
            {state === "conflict" ? (
              <button className="btn btn-small" onClick={() => window.location.reload()}>
                Reload
              </button>
            ) : (
              <button className="btn btn-small" onClick={() => save()}>
                Retry
              </button>
            )}
          </div>
        )}
        <div className="paper">
          <EditorContent editor={editor} />
        </div>
      </div>

      {shareOpen && <SharePanel docId={doc.id} ownerId={user.id} onClose={closeShare} />}
    </>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const chain = () => editor.chain().focus();
  const btn = (label: string, title: string, active: boolean, run: () => void, disabled = false) => (
    <button
      type="button"
      className={`tool ${active ? "active" : ""}`}
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      {label}
    </button>
  );
  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      {btn("↶", "Undo (Ctrl+Z)", false, () => chain().undo().run(), !editor.can().undo())}
      {btn("↷", "Redo (Ctrl+Y)", false, () => chain().redo().run(), !editor.can().redo())}
      <span className="tool-sep" />
      {btn("Normal", "Normal text", editor.isActive("paragraph"), () => chain().setParagraph().run())}
      {btn("H1", "Heading 1", editor.isActive("heading", { level: 1 }), () => chain().toggleHeading({ level: 1 }).run())}
      {btn("H2", "Heading 2", editor.isActive("heading", { level: 2 }), () => chain().toggleHeading({ level: 2 }).run())}
      {btn("H3", "Heading 3", editor.isActive("heading", { level: 3 }), () => chain().toggleHeading({ level: 3 }).run())}
      <span className="tool-sep" />
      {btn("B", "Bold (Ctrl+B)", editor.isActive("bold"), () => chain().toggleBold().run())}
      {btn("I", "Italic (Ctrl+I)", editor.isActive("italic"), () => chain().toggleItalic().run())}
      {btn("U", "Underline (Ctrl+U)", editor.isActive("underline"), () => chain().toggleUnderline().run())}
      {btn("S", "Strikethrough", editor.isActive("strike"), () => chain().toggleStrike().run())}
      <span className="tool-sep" />
      {btn("• List", "Bulleted list", editor.isActive("bulletList"), () => chain().toggleBulletList().run())}
      {btn("1. List", "Numbered list", editor.isActive("orderedList"), () => chain().toggleOrderedList().run())}
      {btn("❝", "Quote", editor.isActive("blockquote"), () => chain().toggleBlockquote().run())}
    </div>
  );
}
