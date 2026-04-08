"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import DashboardShell from "../../../components/dashboard/DashboardShell";
import { apiRequest } from "../../../lib/api";
import { loadSession, saveSession } from "../../../lib/session";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState({ name: "", phone: "", department: "" });
  const [passwords, setPasswords] = useState({ current_password: "", new_password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const activeSession = loadSession();
    if (!activeSession) {
      router.replace("/login");
      return;
    }

    setSession(activeSession);
    apiRequest("/auth/profile", { token: activeSession.token })
      .then((response) => setProfile({
        name: response.user?.name || "",
        phone: response.user?.phone || "",
        department: response.user?.department || "",
      }))
      .catch((requestError) => setError(requestError.message));
  }, [router]);

  async function updateProfile(event) {
    event.preventDefault();
    setError("");
    setMessage("");

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
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");

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
    }
  }

  const heroStats = [
    { label: "Role", value: session?.user?.role || "member" },
    { label: "Talent ID", value: session?.user?.talent_id || "Not set", color: "#4f8cff" },
    { label: "Department", value: profile.department || "Not set", color: "#1fc778" },
    { label: "Phone", value: profile.phone || "Add number", color: profile.phone ? "#f4a42d" : "#94a3b8" },
  ];

  return (
    <DashboardShell session={session} title="Profile Settings" eyebrow="My Account" heroStats={heroStats}>
      {error ? <div className="alert error">{error}</div> : null}
      {message ? <div className="alert">{message}</div> : null}
      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-header"><h2>Profile</h2></div>
          <form className="form-grid" onSubmit={updateProfile}>
            <label className="field"><span>Name</span><input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="field"><span>Phone</span><input value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="field"><span>Department</span><input value={profile.department} onChange={(event) => setProfile((current) => ({ ...current, department: event.target.value }))} /></label>
            <button className="button primary" type="submit">Save Profile</button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header"><h2>Change Password</h2></div>
          <form className="form-grid" onSubmit={changePassword}>
            <label className="field"><span>Current Password</span><input type="password" value={passwords.current_password} onChange={(event) => setPasswords((current) => ({ ...current, current_password: event.target.value }))} /></label>
            <label className="field"><span>New Password</span><input type="password" value={passwords.new_password} onChange={(event) => setPasswords((current) => ({ ...current, new_password: event.target.value }))} /></label>
            <button className="button primary" type="submit">Update Password</button>
          </form>
        </article>
      </section>
    </DashboardShell>
  );
}
