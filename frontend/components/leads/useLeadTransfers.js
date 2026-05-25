// frontend/components/leads/useLeadTransfers.js
"use client";

import { useState, useEffect, useRef } from "react";
import { apiRequest } from "../../lib/api";
import { loadSession } from "../../lib/session";

export function useLeadTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const session = loadSession();
  const token = session?.token;
  const timerRef = useRef(null);

  const fetchPendingTransfers = async () => {
    if (!token) return;
    try {
      const data = await apiRequest("/lead-transfers/pending", { token });
      setTransfers(data || []);
      if (data && data.length > 0) {
        setShowModal(true);
      } else {
        setShowModal(false);
      }
    } catch (error) {
      console.error("Failed to fetch pending transfers:", error);
    }
  };

  useEffect(() => {
    fetchPendingTransfers();

    // Poll every 30 seconds for new transfers
    timerRef.current = setInterval(fetchPendingTransfers, 30000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [token]);

  const acknowledgeTransfer = async (id, note) => {
    if (!token) return;
    try {
      await apiRequest(`/lead-transfers/${id}/acknowledge`, {
        method: "POST",
        token,
        body: { note },
      });

      // Remove the acknowledged transfer from state
      setTransfers((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (next.length === 0) {
          setShowModal(false);
        }
        return next;
      });
    } catch (error) {
      console.error("Failed to acknowledge transfer:", error);
      throw error;
    }
  };

  const currentTransfer = transfers.length > 0 ? transfers[0] : null;
  const totalPending = transfers.length;

  return {
    showModal,
    currentTransfer,
    totalPending,
    acknowledgeTransfer,
  };
}
