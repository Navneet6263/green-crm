"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SettingsLayout, { S } from "../../../components/settings/SettingsLayout";
import { apiRequest } from "../../../lib/api";
import { loadSession, saveSession } from "../../../lib/session";

const initials = (v = "User") => String(v).split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("") || "U";
const titleize = (v) => String(v || "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** My profile: name, phone, department, password, and the account details. */
export default function ProfileSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState({ name: "", phone: "", department: "" });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const s = loadSession();
    if (!s) { router.replace("/login?next=/settings/profile"); return; }
    setSession(s);
    // Show what we already know at once; the server copy replaces it when it arrives.
    setProfile({ name: s.user?.name || "", phone: s.user?.phone || "", department: s.user?.department || "" });
    apiRequest("/auth/profile", { token: s.token })
      .then((r) => setProfile({ name: r.user?.name || "", phone: r.user?.phone || "", department: r.user?.department || "" }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  async function updateProfile(e) {
    e.preventDefault();
    setError(""); setMessage(""); setSavingProfile(true);
    try {
      const r = await apiRequest("/auth/profile", { method: "PUT", token: session.token, body: profile });
      saveSession({ ...session, user: { ...session.user, ...r.user } });
      setSession((c) => ({ ...c, user: { ...c.user, ...r.user } }));
      setMessage("Profile saved.");
    } catch (err) { setError(err.message); } finally { setSavingProfile(false); }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm) { setError("The two new passwords do not match."); return; }
    setError(""); setMessage(""); setSavingPassword(true);
    try {
      await apiRequest("/auth/change-password", { method: "PUT", token: session.token, body: { current_password: passwords.current_password, new_password: passwords.new_password } });
      setPasswords({ current_password: "", new_password: "", confirm: "" });
      setMessage("Password changed.");
    } catch (err) { setError(err.message); } finally { setSavingPassword(false); }
  }

  const user = session?.user || {};
  const strong = passwords.new_password.length >= 8 && /\d/.test(passwords.new_password) && /[A-Za-z]/.test(passwords.new_password);
  return (
    <SettingsLayout session={session} active="profile">
      {error ? <p role="alert" className="rounded-[12px] bg-rose-50 px-4 py-2.5 text-[13px] text-rose-700 ring-1 ring-rose-100">{error}</p> : null}
      {message ? <p role="status" className="rounded-[12px] bg-emerald-50 px-4 py-2.5 text-[13px] font-medium text-emerald-800 ring-1 ring-emerald-100">✓ {message}</p> : null}

      <section className={`${S.cardPad} flex flex-wrap items-center gap-4`}>
        <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[18px] font-bold text-white">{initials(profile.name || user.name)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold text-slate-900">{profile.name || user.name || "Your name"}</p>
          <p className="text-[13px] text-slate-500">{[user.email, titleize(user.role), profile.department].filter(Boolean).join(" · ")}</p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
          <dt className="text-slate-400">User ID</dt><dd className="font-medium text-slate-700">{user.user_id || "–"}</dd>
          <dt className="text-slate-400">Company</dt><dd className="font-medium text-slate-700">{session?.company?.name || user.company_id || "–"}</dd>
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <form className={`${S.cardPad} space-y-3`} onSubmit={updateProfile}>
          <div>
            <h2 className={S.sectionTitle}>Personal details</h2>
            <p className="text-[12.5px] text-slate-500">Shown to your team on leads, tasks and chats.</p>
          </div>
          <label className="block space-y-1"><span className={S.label}>Full name</span><input className={S.input} value={profile.name} onChange={(e) => setProfile((c) => ({ ...c, name: e.target.value }))} disabled={loading && !profile.name} required /></label>
          <label className="block space-y-1"><span className={S.label}>Phone</span><input className={S.input} value={profile.phone} onChange={(e) => setProfile((c) => ({ ...c, phone: e.target.value }))} placeholder="Your mobile number" /></label>
          <label className="block space-y-1"><span className={S.label}>Department</span><input className={S.input} value={profile.department} onChange={(e) => setProfile((c) => ({ ...c, department: e.target.value }))} placeholder="e.g. Sales, Support" /></label>
          <label className="block space-y-1"><span className={S.label}>Email</span><input className={`${S.input} bg-slate-50 text-slate-500`} value={user.email || ""} disabled /><span className="text-[11.5px] text-slate-400">Ask an admin to change your login email.</span></label>
          <div className="flex justify-end"><button type="submit" disabled={savingProfile} className={S.primary}>{savingProfile ? "Saving…" : "Save details"}</button></div>
        </form>

        <form className={`${S.cardPad} space-y-3`} onSubmit={changePassword}>
          <div>
            <h2 className={S.sectionTitle}>Password</h2>
            <p className="text-[12.5px] text-slate-500">Use at least 8 characters with letters and numbers.</p>
          </div>
          <label className="block space-y-1"><span className={S.label}>Current password</span><input className={S.input} type={show ? "text" : "password"} autoComplete="current-password" value={passwords.current_password} onChange={(e) => setPasswords((c) => ({ ...c, current_password: e.target.value }))} required /></label>
          <label className="block space-y-1"><span className={S.label}>New password</span><input className={S.input} type={show ? "text" : "password"} autoComplete="new-password" value={passwords.new_password} onChange={(e) => setPasswords((c) => ({ ...c, new_password: e.target.value }))} required /></label>
          {passwords.new_password ? <p className={`text-[11.5px] font-semibold ${strong ? "text-emerald-700" : "text-amber-700"}`}>{strong ? "Strong enough" : "Add more characters, with letters and numbers"}</p> : null}
          <label className="block space-y-1"><span className={S.label}>New password again</span><input className={S.input} type={show ? "text" : "password"} autoComplete="new-password" value={passwords.confirm} onChange={(e) => setPasswords((c) => ({ ...c, confirm: e.target.value }))} required /></label>
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-[12.5px] text-slate-600"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />Show passwords</label>
            <button type="submit" disabled={savingPassword || !passwords.current_password || !passwords.new_password} className={S.primary}>{savingPassword ? "Changing…" : "Change password"}</button>
          </div>
        </form>
      </div>
    </SettingsLayout>
  );
}
