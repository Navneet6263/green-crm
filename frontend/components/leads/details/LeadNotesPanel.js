"use client";

import { memo, useState } from "react";

import DashboardIcon from "../../dashboard/icons";

function NoteItem({ note, renderWhen }) {
  return (
    <div className="rounded-[20px] bg-[#fffaf1] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <strong className="text-sm text-[#060710]">{note.created_by_name || "User"}</strong>
        <span className="text-xs font-semibold text-[#8f816a]">{renderWhen(note.created_at, true)}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5f533f]">{note.content}</p>
    </div>
  );
}

function LeadNotesPanel({
  inputClassName,
  notes,
  onSave,
  primaryButtonClassName,
  renderWhen,
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const hasOverflow = notes.length > 4;

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
      setComposerOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#060710]">Follow-up Notes</h2>
          <p className="mt-1 text-sm text-[#7a6b57]">Latest customer context, objections, and next-step notes.</p>
        </div>
        <button
          className={`${primaryButtonClassName} min-h-[40px]`}
          type="button"
          onClick={() => setComposerOpen((current) => !current)}
        >
          <DashboardIcon name="plus" className="h-4 w-4" />
          + Add Follow-up
        </button>
      </div>

      {composerOpen ? (
        <form className="grid gap-4 rounded-[24px] bg-[#fffaf1] p-4" onSubmit={handleSubmit}>
          <textarea
            className={`${inputClassName} min-h-[140px] resize-y`}
            rows="4"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Capture context, objections, next step, or customer feedback"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="inline-flex min-h-[40px] items-center justify-center rounded-[16px] border border-[#eadfcd] bg-white px-4 py-2 text-sm font-semibold text-[#5d503c] transition hover:text-[#060710]"
              type="button"
              onClick={() => {
                setComposerOpen(false);
                setDraft("");
              }}
            >
              Cancel
            </button>
            <button
              className={`${primaryButtonClassName} min-h-[40px]`}
              type="submit"
              disabled={saving || !draft.trim()}
            >
              {saving ? "Saving..." : "Save Follow-up"}
            </button>
          </div>
        </form>
      ) : null}

      {notes.length ? (
        <div className={`space-y-3 ${hasOverflow ? "max-h-[430px] overflow-y-auto pr-1" : ""}`}>
          {notes.map((note) => (
            <NoteItem
              key={note.id || note.note_id || `${note.created_at}-${note.content}`}
              note={note}
              renderWhen={renderWhen}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-[22px] border border-dashed border-[#ddd0bb] bg-[#fffaf1] px-4 py-10 text-center text-sm text-[#7a6b57]">
          No follow-up notes yet.
        </p>
      )}
    </div>
  );
}

export default memo(LeadNotesPanel);
