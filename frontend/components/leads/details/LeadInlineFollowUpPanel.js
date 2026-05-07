"use client";

import { useEffect, useRef, useState } from "react";

import { apiRequest } from "../../../lib/api";
import { formatIndiaDateTime } from "../../../lib/dateTime";
import { formatScopedError } from "../../../lib/teamScope";
import {
  LEAD_INPUT_CLASS,
  LEAD_KICKER_CLASS,
  LEAD_PRIMARY_BUTTON_CLASS,
} from "../shared/leadPageConstants";

function InlineNoteItem({ note }) {
  return (
    <div className="rounded-[18px] bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm text-[#060710]">{note.created_by_name || "User"}</strong>
        <span className="text-xs font-semibold text-[#8f816a]">
          {formatIndiaDateTime(note.created_at, true)}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5f533f]">{note.content}</p>
    </div>
  );
}

export default function LeadInlineFollowUpPanel({
  lead,
  onLeadUpdate,
  sessionToken,
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState([]);
  const [saving, setSaving] = useState(false);
  const saveLockRef = useRef(false);

  useEffect(() => {
    setDraft("");
    setError("");
  }, [lead?.lead_id]);

  useEffect(() => {
    if (!lead?.lead_id || !sessionToken) {
      setNotes([]);
      return;
    }

    let ignore = false;
    setLoading(true);
    setError("");

    apiRequest(`/leads/${lead.lead_id}/notes?page_size=4`, { token: sessionToken })
      .then((response) => {
        if (!ignore) {
          setNotes(response.items || []);
        }
      })
      .catch((requestError) => {
        if (!ignore) {
          setError(formatScopedError(requestError, "Could not load follow-up notes."));
          setNotes([]);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [lead?.lead_id, sessionToken]);

  function saveNote() {
    const content = draft.trim();
    if (!content || saveLockRef.current) {
      return;
    }

    const localNote = {
      note_id: `local-${Date.now()}`,
      content,
      created_at: new Date().toISOString(),
      created_by_name: "You",
    };
    saveLockRef.current = true;
    setSaving(true);
    setError("");
    setDraft("");
    setNotes((current) => [localNote, ...current].slice(0, 4));
    onLeadUpdate?.(lead.lead_id, content);
    setTimeout(() => {
      saveLockRef.current = false;
      setSaving(false);
    }, 500);
    apiRequest(`/leads/${lead.lead_id}/notes`, { method: "POST", token: sessionToken, body: { content } })
      .catch((requestError) => setError(formatScopedError(requestError, "Could not save this follow-up note.")));
  }

  return (
    <div className="rounded-[24px] border border-[#eadfcd] bg-[#fffaf1] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={LEAD_KICKER_CLASS}>Follow-up Notes</p>
          <h4 className="mt-2 text-lg font-semibold text-[#060710]">Latest notes and next update</h4>
        </div>
        <span className="inline-flex rounded-full border border-[#eadfcd] bg-white px-3 py-1 text-[11px] font-bold text-[#7c6d55]">
          {lead?.note_count || 0} notes
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="rounded-[18px] bg-white px-4 py-4 text-sm text-[#7a6b57]">Loading latest notes...</p>
        ) : notes.length ? (
          <div className="max-h-[240px] space-y-3 overflow-y-auto pr-1">
            {notes.map((note, index) => (
              <InlineNoteItem
                key={note.note_id || note.id || `${note.created_at}-${index}`}
                note={note}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-[18px] bg-white px-4 py-4 text-sm text-[#7a6b57]">No follow-up notes yet.</p>
        )}

        <div className="space-y-3">
          <textarea
            rows="4"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Write follow-up context, next step, objection, or update here"
            className={`${LEAD_INPUT_CLASS} min-h-[120px] resize-y bg-white`}
          />
          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
          <div className="flex justify-end">
            <button
              type="button"
              className={LEAD_PRIMARY_BUTTON_CLASS}
              disabled={saving || !draft.trim()}
              onClick={saveNote}
            >
              {saving ? "Saving..." : "Save Follow-up Note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
