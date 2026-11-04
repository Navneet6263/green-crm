"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, apiRequest } from "../../lib/api";

/** Chats, the open conversation and live updates for Discuss. */
export function useDiscuss(session) {
  const token = session?.token;
  const [list, setList] = useState(null);
  const myId = Number(session?.user?.id || list?.me || 0);
  const [activeKey, setActiveKey] = useState("");
  const [thread, setThread] = useState(null);
  const [error, setError] = useState("");
  const [typing, setTyping] = useState({});
  const activeRef = useRef("");
  const listTimer = useRef(null);
  activeRef.current = activeKey;

  const loadList = useCallback(async () => {
    if (!token) return;
    try { setList(await apiRequest("/discuss/chats", { token, fresh: true })); } catch (err) { setError(err.message || "Discuss could not load."); }
  }, [token]);
  const refreshList = useCallback(() => { clearTimeout(listTimer.current); listTimer.current = setTimeout(loadList, 400); }, [loadList]);

  const openChat = useCallback(async (key) => {
    setActiveKey(key);
    if (!key) { setThread(null); return; }
    setThread((t) => (t?.chat?.key === key ? t : { loading: true, chat: { key }, messages: [] }));
    try {
      const data = await apiRequest(`/discuss/messages?chat=${encodeURIComponent(key)}`, { token, fresh: true });
      if (activeRef.current === key) setThread(data);
      setList((l) => (l ? { ...l, chats: l.chats.map((c) => (c.key === key ? { ...c, unread: 0 } : c)) } : l));
    } catch (err) {
      if (activeRef.current === key) setThread({ error: err.message || "This chat could not load.", chat: { key }, messages: [] });
    }
  }, [token]);

  const loadEarlier = useCallback(async () => {
    if (!thread?.messages?.length || !thread.has_more) return;
    const key = thread.chat.key;
    const data = await apiRequest(`/discuss/messages?chat=${encodeURIComponent(key)}&before=${encodeURIComponent(thread.messages[0].created_at)}`, { token, fresh: true });
    if (activeRef.current === key) setThread((t) => ({ ...t, messages: [...data.messages, ...t.messages], has_more: data.has_more }));
  }, [thread, token]);

  useEffect(() => { loadList(); }, [loadList]);

  // Live updates. EventSource reconnects by itself if the connection drops.
  useEffect(() => {
    if (!token) return undefined;
    const source = new EventSource(`${API_BASE}/discuss/stream?token=${encodeURIComponent(token)}`);
    source.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch (_e) { return; }
      if (data.type === "message") {
        const mine = Number(data.sender_id) === myId;
        const key = data.chat_group || `d:${mine ? data.recipient_id : data.sender_id}`;
        const message = { ...data.message, mine };
        if (activeRef.current === key) {
          setThread((t) => (t?.messages && !t.messages.some((m) => m.id === message.id) ? { ...t, messages: [...t.messages, message] } : t));
          if (!mine) apiRequest("/discuss/read", { method: "POST", body: { chat: key }, token }).catch(() => {});
        }
        setTyping((all) => ({ ...all, [key]: null }));
        refreshList();
      } else if (data.type === "updated") {
        setThread((t) => (t?.messages ? { ...t, messages: t.messages.map((m) => (m.id === data.message.id ? { ...data.message, mine: m.mine } : m)) } : t));
        refreshList();
      } else if (data.type === "typing") {
        setTyping((all) => ({ ...all, [data.chat]: data.typing ? { name: data.sender_name, at: Date.now() } : null }));
      } else if (data.type === "chats") refreshList();
    };
    return () => source.close();
  }, [token, myId, refreshList]);

  // Typing notes fade out if the "stopped typing" event never comes.
  useEffect(() => {
    const timer = setInterval(() => setTyping((all) => Object.fromEntries(Object.entries(all).filter(([, v]) => v && Date.now() - v.at < 6000))), 3000);
    return () => clearInterval(timer);
  }, []);

  const send = useCallback(async ({ text, leadId, replyTo }) => {
    const key = activeRef.current;
    const message = await apiRequest("/discuss/messages", { method: "POST", body: { chat: key, text, lead_id: leadId || undefined, reply_to: replyTo || undefined }, token });
    setThread((t) => (t?.chat?.key === key && !t.messages.some((m) => m.id === message.id) ? { ...t, messages: [...t.messages, message] } : t));
    refreshList();
    return message;
  }, [token, refreshList]);

  const edit = useCallback(async (id, text) => {
    const message = await apiRequest(`/discuss/messages/${id}`, { method: "PATCH", body: { text }, token });
    setThread((t) => ({ ...t, messages: t.messages.map((m) => (m.id === id ? message : m)) }));
  }, [token]);

  const remove = useCallback(async (id) => {
    const message = await apiRequest(`/discuss/messages/${id}`, { method: "DELETE", token });
    setThread((t) => ({ ...t, messages: t.messages.map((m) => (m.id === id ? message : m)) }));
    refreshList();
  }, [token, refreshList]);

  const lastTypingPing = useRef(0);
  const pingTyping = useCallback((isTyping) => {
    const key = activeRef.current;
    if (!key || (isTyping && Date.now() - lastTypingPing.current < 2500)) return;
    lastTypingPing.current = isTyping ? Date.now() : 0;
    apiRequest("/discuss/typing", { method: "POST", body: { chat: key, typing: isTyping }, token }).catch(() => {});
  }, [token]);

  const createGroup = useCallback(async (body) => {
    const res = await apiRequest("/discuss/groups", { method: "POST", body, token });
    await loadList();
    openChat(res.key);
  }, [token, loadList, openChat]);

  const updateGroup = useCallback(async (id, body) => {
    await apiRequest(`/discuss/groups/${id}`, { method: "PATCH", body, token });
    await loadList();
    openChat(activeRef.current);
  }, [token, loadList, openChat]);

  const leaveGroup = useCallback(async (id, archive) => {
    await apiRequest(archive ? `/discuss/groups/${id}` : `/discuss/groups/${id}/leave`, { method: archive ? "DELETE" : "POST", token });
    setActiveKey("");
    setThread(null);
    loadList();
  }, [token, loadList]);

  return { list, thread, activeKey, error, typing, openChat, loadEarlier, send, edit, remove, pingTyping, createGroup, updateGroup, leaveGroup, reload: loadList };
}
