import { apiRequest } from "../../../lib/api";
import { buildCreateFeedback, formDraft, editDraft } from "./userManagementHelpers";

export async function loadWorkspace(session, companyId, setters) {
  const { setUsers, setCompany, setCompanies, setLoading, setError } = setters;

  if (session.user?.role === "super-admin" && !companyId) {
    setUsers([]);
    setCompany(null);
    setLoading(false);
    return;
  }

  setLoading(true);
  setError("");

  try {
    const [ur, sr] = await Promise.all([
      apiRequest(`/auth/users?page_size=120${companyId ? `&company_id=${companyId}` : ""}`, {
        token: session.token,
      }),
      session.user?.role === "super-admin"
        ? apiRequest(`/companies/${companyId}`, { token: session.token })
        : apiRequest("/auth/profile", { token: session.token }),
    ]);

    setUsers(ur.items || []);
    setCompany(session.user?.role === "super-admin" ? sr : sr.company || null);
    if (session.user?.role !== "super-admin") {
      setCompanies(sr.company ? [sr.company] : []);
    }
  } catch (e) {
    setUsers([]);
    setError(e.message);
  } finally {
    setLoading(false);
  }
}

export async function handleCreateUser(session, createForm, scopedCompanyId, isSuperAdmin, setters, callbacks) {
  const { setCreating, setError, setMessage, setMessageTone, setCreateForm, setSelectedUserId } = setters;
  const { loadWorkspace } = callbacks;

  if (!session?.token) return;
  if (isSuperAdmin && !scopedCompanyId) {
    setError("Choose a company first.");
    return;
  }

  setCreating(true);
  setError("");
  setMessage("");
  setMessageTone("success");

  try {
    const r = await apiRequest("/auth/create-employee", {
      method: "POST",
      token: session.token,
      body: { ...createForm, company_id: isSuperAdmin ? scopedCompanyId : undefined },
    });

    const fb = buildCreateFeedback(r);
    setMessage(fb.text);
    setMessageTone(fb.tone);
    setCreateForm(formDraft(scopedCompanyId));
    await loadWorkspace(session, scopedCompanyId);
    if (r.user_id) setSelectedUserId(r.user_id);
  } catch (e) {
    setError(e.message);
  } finally {
    setCreating(false);
  }
}

export async function handleSaveUser(session, selectedUser, memberForm, scopedCompanyId, setters, callbacks) {
  const { setSaving, setError, setMessage, setMessageTone } = setters;
  const { loadWorkspace } = callbacks;

  if (!session?.token || !selectedUser) return;

  setSaving(true);
  setError("");
  setMessage("");
  setMessageTone("success");

  try {
    await apiRequest(`/auth/users/${selectedUser.user_id}`, {
      method: "PUT",
      token: session.token,
      body: {
        name: memberForm.name,
        email: memberForm.email,
        role: memberForm.role,
        phone: memberForm.phone,
        department: memberForm.department,
        ...(memberForm.password.trim() ? { password: memberForm.password } : {}),
      },
    });

    setMessage("Team member updated.");
    await loadWorkspace(session, scopedCompanyId);
  } catch (e) {
    setError(e.message);
  } finally {
    setSaving(false);
  }
}

export async function handleToggleUser(session, selectedUser, scopedCompanyId, setters, callbacks) {
  const { setWorkingId, setError, setMessage, setMessageTone } = setters;
  const { loadWorkspace } = callbacks;

  if (!session?.token || !selectedUser) return;

  setWorkingId(selectedUser.user_id);
  setError("");
  setMessage("");
  setMessageTone("success");

  try {
    await apiRequest(`/auth/users/${selectedUser.user_id}/toggle`, {
      method: "PUT",
      token: session.token,
      body: { is_active: !selectedUser.is_active },
    });

    setMessage(selectedUser.is_active ? "Member deactivated." : "Member activated.");
    await loadWorkspace(session, scopedCompanyId);
  } catch (e) {
    setError(e.message);
  } finally {
    setWorkingId("");
  }
}

export async function handleRemoveUser(session, selectedUser, scopedCompanyId, setters, callbacks) {
  const { setWorkingId, setError, setMessage, setMessageTone } = setters;
  const { loadWorkspace } = callbacks;

  if (
    !session?.token ||
    !selectedUser ||
    !window.confirm(`Remove ${selectedUser.name || selectedUser.email}?`)
  ) {
    return;
  }

  setWorkingId(selectedUser.user_id);
  setError("");
  setMessage("");
  setMessageTone("success");

  try {
    await apiRequest(`/auth/users/${selectedUser.user_id}`, {
      method: "DELETE",
      token: session.token,
    });

    setMessage("Member removed.");
    await loadWorkspace(session, scopedCompanyId);
  } catch (e) {
    setError(e.message);
  } finally {
    setWorkingId("");
  }
}
