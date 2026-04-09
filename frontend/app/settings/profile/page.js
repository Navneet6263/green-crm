"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { loadSession, saveSession } from "../../../lib/session";

const PANEL_CLASS = "rounded-[30px] border border-[#eadfcd] bg-white/82 p-5 shadow-[0_14px_36px_rgba(79,58,22,0.06)] md:p-6";
const INPUT_CLASS = "w-full rounded-[18px] border border-[#eadfcd] bg-white px-4 py-3 text-sm text-[#060710] outline-none transition placeholder:text-[#9c8e76] focus:border-[#d7b258] focus:ring-4 focus:ring-[#f6ead0]";
const PRIMARY_BUTTON_CLASS = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-[#d7b258] bg-[#f3dfab] px-4 py-2.5 text-sm font-semibold text-[#060710] shadow-[0_16px_30px_rgba(203,169,82,0.18)] transition hover:-translate-y-0.5 hover:bg-[#efd48f] disabled:cursor-not-allowed disabled:opacity-60";
const KICKER_CLASS = "text-[10px] font-black uppercase tracking-[0.28em] text-[#9a886d]";

function initials(value = "User") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";
}

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState({ name: "", phone: "", department: "" });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }

    setSession(activeSession);
    apiRequest("/auth/profile", { token: activeSession.token })
      .then((response) =>
        setProfile({
          name: response.user?.name || "",
          phone: response.user?.phone || "",
          department: response.user?.department || "",
        })
      )
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [router]);

  async function updateProfile(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingProfile(true);

    try {
      const response = await apiRequest("/auth/profile", {
        method: "PUT",
        token: session.token,
        body: profile,
      });
      saveSession({ ...session, user: { ...session.user, ...response.user } });
      setSession((current) => ({ ...current, user: { ...current.user, ...response.user } }));
      setMessage("Profile updated.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingPassword(true);

    try {
      await apiRequest("/auth/change-password", {
        method: "PUT",
        token: session.token,
        body: passwords,
      });
      setPasswords({ current_password: "", new_password: "" });
      setMessage("Password changed.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <DashboardShell session={session} title="Profile Settings" hideTitle heroStats={[]}>
      {error ? <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div> : null}
      {loading ? <div className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-3 text-sm font-medium text-[#6f614c]">Loading profile workspace...</div> : null}
      {!loading ? (
        <section className="space-y-5">
          <article className="rounded-[34px] border border-[#eadfcd] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(247,240,227,0.96)_42%,_rgba(241,232,215,1)_100%)] p-5 shadow-[0_22px_60px_rgba(79,58,22,0.08)] md:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-[#10111d] text-xl font-bold text-white shadow-[0_18px_32px_rgba(6,7,16,0.18)]">
                    {initials(profile.name || session?.user?.name || "User")}
                  </div>
                  <div>
                    <span className="inline-flex rounded-full border border-[#ddd3c2] bg-white/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-[#7c6d55]">
                      Account Desk
                    </span>
                    <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[#060710] md:text-[3rem] md:leading-[1.04]">
                      Profile, security, and workspace identity in one cleaner account surface.
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[#746853] md:text-base">
                      Keep your personal details current, rotate passwords safely, and review the key account identifiers without the older stacked forms.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 xl:min-w-[420px] xl:max-w-[460px] xl:w-full sm:grid-cols-2">
                {[
                  { label: "Role", value: session?.user?.role || "member" },
                  { label: "Talent ID", value: session?.user?.talent_id || "Not set" },
                  { label: "Department", value: profile.department || "Not set" },
                  { label: "Phone", value: profile.phone || "Add number" },
                ].map((item, index) => (
                  <div key={item.label} className={`rounded-[24px] border border-[#eadfcd] p-4 shadow-[0_12px_28px_rgba(79,58,22,0.05)] ${index === 0 ? "bg-[#fff6e4]" : "bg-white/88"}`}>
                    <p className={KICKER_CLASS}>{item.label}</p>
                    <p className="mt-4 text-2xl font-semibold tracking-tight text-[#060710]">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr] xl:items-start">
            <article className={PANEL_CLASS}>
              <div className="mb-5">
                <p className={KICKER_CLASS}>Profile</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Personal details</h3>
              </div>

              <form className="grid gap-4 md:grid-cols-2" onSubmit={updateProfile}>
                <label className="space-y-2">
                  <span className={KICKER_CLASS}>Name</span>
                  <input className={INPUT_CLASS} value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} />
                </label>
                <label className="space-y-2">
                  <span className={KICKER_CLASS}>Phone</span>
                  <input className={INPUT_CLASS} value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className={KICKER_CLASS}>Department</span>
                  <input className={INPUT_CLASS} value={profile.department} onChange={(event) => setProfile((current) => ({ ...current, department: event.target.value }))} />
                </label>

                <div className="flex flex-wrap justify-end gap-3 md:col-span-2">
                  <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </article>

            <div className="space-y-5">
              <article className={PANEL_CLASS}>
                <div className="mb-5">
                  <p className={KICKER_CLASS}>Security</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Change password</h3>
                </div>

                <form className="grid gap-4" onSubmit={changePassword}>
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>Current Password</span>
                    <input className={INPUT_CLASS} type="password" value={passwords.current_password} onChange={(event) => setPasswords((current) => ({ ...current, current_password: event.target.value }))} />
                  </label>
                  <label className="space-y-2">
                    <span className={KICKER_CLASS}>New Password</span>
                    <input className={INPUT_CLASS} type="password" value={passwords.new_password} onChange={(event) => setPasswords((current) => ({ ...current, new_password: event.target.value }))} />
                  </label>

                  <button className={PRIMARY_BUTTON_CLASS} type="submit" disabled={savingPassword}>
                    {savingPassword ? "Updating..." : "Update Password"}
                  </button>
                </form>
              </article>

              <article className={PANEL_CLASS}>
                <div className="mb-5">
                  <p className={KICKER_CLASS}>Workspace Identity</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#060710]">Account snapshot</h3>
                </div>

                <div className="grid gap-3">
                  {[
                    ["Email", session?.user?.email || "Not available"],
                    ["Role", session?.user?.role || "member"],
                    ["Talent ID", session?.user?.talent_id || "Not set"],
                    ["Department", profile.department || "Not set"],
                    ["Phone", profile.phone || "Not set"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[22px] border border-[#eadfcd] bg-[#fffaf1] px-4 py-4">
                      <span className={KICKER_CLASS}>{label}</span>
                      <strong className="mt-3 block text-sm leading-6 text-[#060710]">{value}</strong>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>
      ) : null}
    </DashboardShell>
  );
}
