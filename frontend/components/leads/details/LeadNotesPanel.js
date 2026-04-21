"use client";

import { memo, useState } from "react";

function LeadNotesPanel({
  inputClassName,
  kickerClassName,
  notes,
  onSave,
  primaryButtonClassName,
  renderWhen,
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const content = draft.trim();
    if (!content || saving) {
      return;
    }

    setSaving(true);

    try {
      await onSave(content);
      setDraft("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="space-y-2">
          <span className={kickerClassName}>Add Note</span>
          <textarea
            className={`${inputClassName} min-h-[150px] resize-y`}
            rows="4"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Capture context, objections, or next steps"
          />
        </label>
        <button
          className={primaryButtonClassName}
          type="submit"
          disabled={saving || !draft.trim()}
        >
          {saving ? "Saving..." : "Save Note"}
        </button>
      </form>
      <div className="mt-4 space-y-3">
        {notes.length ? (
          notes.map((note) => (
            <div
              className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4"
              key={note.id || note.note_id || `${note.created_at}-${note.content}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <strong className="text-sm text-[#060710]">
                  {note.created_by_name || "User"}
                </strong>
                <span className="text-xs font-semibold text-[#8f816a]">
                  {renderWhen(note.created_at, true)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-[#5f533f]">{note.content}</p>
            </div>
          ))
        ) : (
          <p className="rounded-[22px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-10 text-center text-sm text-[#7a6b57]">
            No notes yet.
          </p>
        )}
      </div>
    </>
  );
}

export default memo(LeadNotesPanel);
