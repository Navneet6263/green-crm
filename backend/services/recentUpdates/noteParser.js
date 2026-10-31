// Reads the structured lines that the lead/customer dialogs write into a note
// ("Status changed: A -> B", "Customer response: ...", "Next follow-up: ...").
// Free text that is not one of these lines is kept as the note itself.
const KEYS = ['Customer response', 'Next follow-up', 'Mode', 'Calling status', 'Email status', 'Demo scheduled', 'Requirement', 'Notes', 'Note'];
const SPLIT_BEFORE = new RegExp(`\\s+(?=(?:${KEYS.join('|')}):)`, 'g');

function parseNote(content) {
  const out = {
    kind: 'note',
    statusFrom: '',
    statusTo: '',
    response: '',
    mode: '',
    callStatus: '',
    nextFollowUp: '',
    demoAt: '',
    requirement: '',
    assignedFrom: '',
    assignedTo: '',
    note: '',
  };
  let followUpLog = false;
  const rest = [];
  // Older notes were saved on one line; break them at the known labels.
  const text = String(content || '').replace(/\r/g, '').replace(SPLIT_BEFORE, '\n');

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^Status changed:\s*(.*?)\s*(?:->|→)\s*(.+)$/i)) || (m = line.match(/^Status changed from (.+?) to (.+)$/i))) {
      out.statusFrom = m[1].trim();
      out.statusTo = m[2].trim();
    } else if ((m = line.match(/^Status changed:\s*(.+)$/i))) {
      out.statusTo = m[1].trim();
    } else if (/^Follow-up Status$/i.test(line)) {
      followUpLog = true;
    } else if ((m = line.match(/^Customer response:\s*(.*)$/i))) {
      out.response = m[1].trim();
    } else if ((m = line.match(/^Mode:\s*(.*)$/i))) {
      out.mode = m[1].trim();
    } else if ((m = line.match(/^(?:Calling|Email) status:\s*(.*)$/i))) {
      out.callStatus = m[1].trim();
    } else if ((m = line.match(/^Next follow-up:\s*(.*)$/i))) {
      const value = m[1].trim();
      const withMode = value.match(/^(.*?)\s*\(([^)]+)\)$/);
      out.nextFollowUp = withMode ? withMode[1] : value;
      if (withMode && !out.mode) out.mode = withMode[2];
    } else if ((m = line.match(/^Demo scheduled:\s*(.*)$/i))) {
      out.demoAt = m[1].trim();
    } else if ((m = line.match(/^Requirement:\s*(.*)$/i))) {
      out.requirement = m[1].trim();
    } else if ((m = line.match(/^Assigned from (.+?) to (.+)$/i))) {
      out.assignedFrom = m[1].trim();
      out.assignedTo = m[2].trim();
    } else if ((m = line.match(/^(?:Notes?|Comment|Remarks?):\s*(.*)$/i))) {
      if (m[1].trim()) rest.push(m[1].trim());
    } else {
      rest.push(line);
    }
  }

  out.note = rest.join('\n');
  if (out.demoAt) out.kind = 'demo';
  else if (out.statusTo) out.kind = 'status';
  else if (followUpLog || out.response || out.callStatus) out.kind = 'followup';
  return out;
}

const KIND_LABELS = { demo: 'Demo booked', status: 'Status change', followup: 'Follow-up call', note: 'Note' };

module.exports = { parseNote, KIND_LABELS };
