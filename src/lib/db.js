// src/lib/db.js

export const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ---------- CLIENTS ----------

export const getClients = async () => {
  const res = await fetch(`${API}/clients`);
  return res.json();
};

export const addClient = async (data) => {
  const res = await fetch(`${API}/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updateClient = async (id, data) => {
  const res = await fetch(`${API}/clients/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json();
};

export const deleteClient = async (id) => {
  await fetch(`${API}/clients/${id}`, {
    method: "DELETE"
  });
};

// ---------- GROUPS ----------

export const getGroups = async () => {
  const res = await fetch(`${API}/groups`);
  return res.json();
};

export const addGroup = async (group) => {
  const res = await fetch(`${API}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(group)
  });
  return res.json();
};

export const updateGroup = async (id, data) => {
  const res = await fetch(`${API}/groups/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteGroup = async (id) => {
  await fetch(`${API}/groups/${id}`, {
    method: "DELETE"
  });
};

export const updateGroupMembers = async (id, memberIds) => {
  const res = await fetch(`${API}/groups/${id}/members`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberIds })
  });
  return res.json();
};

export const getPayments = async () => {
  const res = await fetch(`${API}/payments`);
  return res.json();
};

export const addPayment = async (data) => {
  const res = await fetch(`${API}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  return res.json();
};

export const updatePayment = async (id, data) => {
  const res = await fetch(`${API}/payments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Server ${res.status}: ${text}`);
  }
  return res.json();
};

export const deletePayment = async (id) => {
  await fetch(`${API}/payments/${id}`, {
    method: "DELETE"
  });
};

// ---------- INSTALLMENTS ----------

export const getInstallments = async () => {
  const res = await fetch(`${API}/installments`);
  return res.json();
};

export const saveInstallment = async (data) => {
  const res = await fetch(`${API}/installments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteInstallment = async (id) => {
  await fetch(`${API}/installments/${id}`, { method: "DELETE" });
};

export const uploadInstallmentDocs = async (id, formData) => {
  const res = await fetch(`${API}/installments/${id}/documents`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Server ${res.status}: ${t}`); }
  return res.json();
};

export const deleteInstallmentDoc = async (id, docId) => {
  const res = await fetch(`${API}/installments/${id}/documents/${docId}`, { method: "DELETE" });
  if (!res.ok) { const t = await res.text(); throw new Error(`Server ${res.status}: ${t}`); }
  return res.json();
};
