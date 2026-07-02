import React, { useEffect, useMemo, useRef, useState } from "react";
import LOGO_B64 from "./logoBase64.js";
import SIGN_B64 from "./signBase64.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import {
  Users,
  Wallet,
  CalendarDays,
  Layers3,
  Search,
  Plus,
  Trash2,
  Pencil,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  X,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import {
  getClients,
  addClient,
  updateClient,
  deleteClient,
  getGroups,
  addGroup,
  updateGroup,
  deleteGroup,
  updateGroupMembers,
  uploadGroupClientDocs,
  deleteGroupClientDoc,
  uploadGroupDocs,
  deleteGroupDoc,
  getPayments,
  addPayment as addPaymentApi,
  updatePayment as updatePaymentApi,
  deletePayment as deletePaymentApi,
  getInstallments,
  saveInstallment as saveInstallmentApi,
  deleteInstallment as deleteInstallmentApi,
  uploadInstallmentDocs,
  deleteInstallmentDoc,
  loginUser,
  getUsers,
  addUser,
  updateUserApi,
  deleteUserApi,
  API,
} from "@/lib/db";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currentYear = new Date().getFullYear();

const initialData = {
  clients: [
    {
      id: crypto.randomUUID(),
      clientCode: "CL001",
      name: "Arun Kumar",
      phone: "9876543210",
      email: "arun@example.com",
      address: "Bengaluru",
      notes: "Preferred monthly payment by UPI",
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      clientCode: "CL002",
      name: "Meena Priya",
      phone: "9123456780",
      email: "meena@example.com",
      address: "Chennai",
      notes: "Regular contributor",
      createdAt: new Date().toISOString(),
    },
  ],
  groups: [
    {
      id: crypto.randomUUID(),
      name: "Gold Savings Group",
      monthlyAmount: 5000,
      durationMonths: 12,
      startYear: currentYear,
      memberIds: [],
      createdAt: new Date().toISOString(),
    },
  ],
  payments: [],
};

function getGroupTimeline(group) {
  const startIndex = MONTHS.indexOf(group.startMonth || "January");
  const safeStart = startIndex >= 0 ? startIndex : 0;
  let monthIdx = safeStart;
  let year = Number(group.startYear || new Date().getFullYear());
  const timeline = [];
  for (let i = 0; i < (group.durationMonths || 12); i++) {
    timeline.push({
      month: MONTHS[monthIdx],
      year,
      label: `${MONTHS[monthIdx].substring(0, 3)} ${year}`,
      installmentNo: i + 1,
    });
    monthIdx++;
    if (monthIdx > 11) { monthIdx = 0; year++; }
  }
  return timeline;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function numberToWords(n) {
  if (n === 0) return "Zero Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function h(num) {
    let s = "";
    if (num >= 100) { s += ones[Math.floor(num / 100)] + " Hundred "; num %= 100; }
    if (num >= 20) { s += tens[Math.floor(num / 10)] + " "; num %= 10; }
    if (num > 0) s += ones[num] + " ";
    return s;
  }
  let amount = Math.floor(n), result = "";
  if (amount >= 10000000) { result += h(Math.floor(amount / 10000000)) + "Crore "; amount %= 10000000; }
  if (amount >= 100000)   { result += h(Math.floor(amount / 100000))   + "Lakhs "; amount %= 100000; }
  if (amount >= 1000)     { result += h(Math.floor(amount / 1000))     + "Thousand "; amount %= 1000; }
  result += h(amount);
  return result.trim() + " Only";
}

async function downloadReceipt({ payment, client, group, ticketNo, chitDueNo }) {
  try {
    const { jsPDF } = await import("jspdf");

    const receiptNo = payment._id ? parseInt(payment._id.slice(-5), 16) % 9000 + 1000 : Math.floor(Math.random() * 9000 + 1000);
    const totalChit = Number(group.monthlyAmount) * Number(group.durationMonths);
    const chitLabel = totalChit >= 100000 ? (totalChit / 100000) + " Lakhs" : formatCurrency(totalChit);
    const amtWords = numberToWords(Number(payment.amount));
    const formattedAmt = Number(payment.amount).toLocaleString("en-IN") + "/-";
    const isNonCash = ["UPI", "Bank Transfer", "Cheque"].includes(payment.mode);
    const phone = (client.phones?.[0] || client.phone || "").replace(/\D/g, "");
    const txnLabel = payment.mode === "Cheque" ? "Cheque No." :
                     payment.mode === "UPI" ? "UPI Transaction ID" :
                     payment.mode === "Bank Transfer" ? "Bank Ref. / Txn ID" : "Ref. No.";
    const txnValue = isNonCash
      ? (payment.transactionId || "—") + "   Date: " + (payment.paymentDate || "")
      : "N/A";

    const encOpts = phone
      ? { encryption: { userPassword: phone, ownerPassword: phone, userPermissions: ["print"] } }
      : {};

    // A5 landscape: 210 × 148 mm
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a5", ...encOpts });
    const W = pdf.internal.pageSize.getWidth();   // 210
    const H = pdf.internal.pageSize.getHeight();  // 148
    const L = 7;   // left margin
    const R = W - 7; // right edge
    const G = [0, 100, 0];   // green #006400
    const K = [0, 0, 0];     // black
    const D = [100, 100, 100]; // grey for dotted lines

    const dot = () => { pdf.setLineDashPattern([0.8, 0.8], 0); pdf.setLineWidth(0.25); };
    const solid = () => { pdf.setLineDashPattern([], 0); pdf.setLineWidth(0.5); };

    // ── Outer border ──
    pdf.setDrawColor(...G);
    solid();
    pdf.setLineWidth(0.7);
    pdf.rect(4, 4, W - 8, H - 8);

    // ── Logo ──
    pdf.addImage(LOGO_B64, "JPEG", W / 2 - 11, 6, 22, 22);

    // ── Top-left: GSTIN / CIN ──
    pdf.setFontSize(7.5); pdf.setFont("helvetica", "bold"); pdf.setTextColor(...G);
    pdf.text("GSTIN : 33AAQCA9731R1ZU",         L, 13);
    pdf.text("CIN NO : U65992TN2018PTC 123004",  L, 18);

    // ── Top-right: Phone / Email ──
    pdf.text("Phone : 9444207983",        R, 13, { align: "right" });
    pdf.text("Email : aknithchits@gmail.com", R, 18, { align: "right" });

    // ── Company name & address ──
    let y = 32;
    pdf.setFontSize(13); pdf.setFont("helvetica", "bold"); pdf.setTextColor(...G);
    pdf.text("AKNITH CHITS PRIVATE LIMITED", W / 2, y, { align: "center" });
    y += 4.5;
    pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal");
    pdf.text("No. 10, Abdul Kalam Street, Nagalkeni, Chromepet, Chennai - 600 044.", W / 2, y, { align: "center" });
    y += 3.5;

    // ── Divider ──
    pdf.setDrawColor(...G); dot();
    pdf.line(L, y, R, y);
    y += 4;

    // ── No. | RECEIPT | Date ──
    pdf.setTextColor(...K);
    pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal");
    pdf.text("No.", L, y);
    pdf.setFontSize(9.5); pdf.setFont("helvetica", "bold");
    pdf.text(String(receiptNo), L + 6, y);

    pdf.setFontSize(12); pdf.setFont("helvetica", "bold");
    pdf.text("RECEIPT", W / 2, y, { align: "center" });
    const rw = pdf.getTextWidth("RECEIPT");
    solid(); pdf.setLineWidth(0.3); pdf.setDrawColor(...K);
    pdf.line(W / 2 - rw / 2, y + 0.6, W / 2 + rw / 2, y + 0.6);

    pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal");
    pdf.text("Date :   " + (payment.paymentDate || new Date().toLocaleDateString("en-IN")), R, y, { align: "right" });
    y += 5.5;

    // ── Field row helper (label + dotted underline + value) ──
    const field = (label, value, x, colW, bold = false) => {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(...K);
      pdf.text(label, x, y);
      const lw = pdf.getTextWidth(label) + 1.5;
      pdf.setDrawColor(...D); dot();
      pdf.line(x + lw, y + 0.4, x + colW - 1, y + 0.4);
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      const val = String(value);
      const maxW = colW - lw - 2;
      const clipped = pdf.getTextWidth(val) > maxW
        ? pdf.splitTextToSize(val, maxW)[0]
        : val;
      pdf.text(" " + clipped, x + lw, y);
    };

    // ── Customer name ──
    field("Customer Name Mr/Mrs", client.name, L, R - L);
    y += 5.5;

    // ── Group / Chit / Ticket / Due ──
    const cols4 = (R - L) / 4;
    field("Group No.",     String(group.groupNumber || group.name), L,             cols4);
    field("Chit :",        chitLabel,                               L + cols4,     cols4);
    field("Ticket No. :",  String(ticketNo),                        L + cols4 * 2, cols4);
    field("Chit Due No. :", String(chitDueNo),                      L + cols4 * 3, cols4);
    y += 5.5;

    // ── Payment mode / Ref ──
    const cols2 = (R - L) / 2;
    field("Payment Mode", payment.mode, L,         cols2);
    field(txnLabel,        txnValue,    L + cols2,  cols2, isNonCash);
    y += 5.5;

    // ── Amount in words ──
    field("Amount in words", amtWords, L, R - L);
    y += 5.5;

    // ── Amount Rs. ──
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(...K);
    pdf.text("Amount Rs.", L, y);
    const aw = pdf.getTextWidth("Amount Rs.") + 1.5;
    pdf.setDrawColor(...D); dot();
    pdf.line(L + aw, y + 0.4, L + aw + 40, y + 0.4);
    pdf.setFont("helvetica", "bold");
    pdf.text(" " + formattedAmt, L + aw, y);
    y += 5.5;

    // ── Remarks ──
    if (payment.remark) {
      field("Remarks", payment.remark, L, R - L);
      y += 5.5;
    }

    y += 1;

    // ── E-Signature ──
    // Signature image: 299×200px original → keep aspect ratio, height ~18mm
    const sigH = 18;
    const sigW = sigH * (299 / 200); // ~26.9mm
    pdf.addImage(SIGN_B64, "PNG", R - sigW, y, sigW, sigH);
    y += sigH + 1;

    // ── Bottom divider (tight to signature) ──
    pdf.setDrawColor(...G); dot();
    pdf.line(L, y, R, y);

    pdf.save(`Receipt_${client.name}_${payment.month}_${payment.year}.pdf`);
  } catch (err) {
    console.error("Receipt download failed:", err);
    alert("Could not generate PDF: " + err.message);
  }
}

const DEFAULT_PERMISSIONS = {
  clients:  { view: false, create: false, edit: false, delete: false },
  groups:   { view: false, create: false, edit: false, delete: false, manageMembers: false },
  payments: { view: false, record: false },
  reports:  { view: false, editSchedule: false, uploadDocs: false },
};

const SESSION_VERSION = "v1";

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      if (localStorage.getItem("chitfund_session_version") !== SESSION_VERSION) {
        localStorage.removeItem("chitfund_user");
        localStorage.setItem("chitfund_session_version", SESSION_VERSION);
        return null;
      }
      return JSON.parse(localStorage.getItem("chitfund_user")) || null;
    }
    catch { return null; }
  });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showUserMgmt, setShowUserMgmt] = useState(false);
  const [userList, setUserList] = useState([]);
  const [userForm, setUserForm] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState(null);

  // const [data, setData] = useState(initialData);4
  const [data, setData] = useState({
    clients: [],
    groups: [],
    payments: [],
    installments: [],
  });
  const [searchClient, setSearchClient] = useState("");
  const [searchGroup, setSearchGroup] = useState("");

  const [clientForm, setClientForm] = useState({
    clientCode: "",
    name: "",
    phones: [""],
    email: "",
    address: "",
    notes: "",
  });

  const [groupForm, setGroupForm] = useState({
    groupNumber: "",
    name: "",
    monthlyAmount: "",
    durationMonths: "12",
    startMonth: "January",
    startYear: String(currentYear),
    adminFeeAmount: "",
    psoNo: "",
    commNo: "",
  });

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [searchAssignClient, setSearchAssignClient] = useState("");
  const [expandedClientIds, setExpandedClientIds] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashSlide, setDashSlide] = useState(0);
  const [dashPaused, setDashPaused] = useState(false);
  const [reportSearch, setReportSearch] = useState("");
  const [confirmPayDialog, setConfirmPayDialog] = useState(false);
  const [paymentAddMode, setPaymentAddMode] = useState("update"); // "update" | "balance"
  const [editTargetPaymentId, setEditTargetPaymentId] = useState(null);
  const [removeClientConfirm, setRemoveClientConfirm] = useState(null); // { groupId, groupName, clientId, clientName }
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState(null);
  const [deleteClientConfirm, setDeleteClientConfirm] = useState(null);
  const [editClientDialog, setEditClientDialog] = useState(null); // client object being edited
  const [editClientForm, setEditClientForm] = useState(null);
  const [editGroupDialog, setEditGroupDialog] = useState(null); // group object being edited
  const [editGroupForm, setEditGroupForm] = useState(null);
  const [editInstDialog, setEditInstDialog] = useState(false);
  const [deleteDocConfirm, setDeleteDocConfirm] = useState(null); // { installmentId, docId, docName }
  const [editingSlot, setEditingSlot] = useState(null);
  const [instEditForm, setInstEditForm] = useState({
    winnerId: "__none__",
    dividend: "",
    payableAmount: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    groupId: "",
    clientId: "",
    month: "January",
    year: String(currentYear),
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    mode: "Cash",
    transactionId: "",
    remark: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      const clients = await getClients();
      const groups = await getGroups();
      const payments = await getPayments();
      const installments = await getInstallments();

      setData({
        clients,
        groups,
        payments,
        installments,
      });
    };

    fetchData();
  }, []);

  // Auto-fill form when an existing payment is detected for selected group+client+installment
  useEffect(() => {
    if (!paymentForm.groupId || !paymentForm.clientId || !paymentForm.month || !paymentForm.year) return;
    const existing = data.payments.find(
      (p) =>
        p.groupId === paymentForm.groupId &&
        p.clientId === paymentForm.clientId &&
        p.month === paymentForm.month &&
        Number(p.year) === Number(paymentForm.year)
    );
    if (existing) {
      setPaymentForm((prev) => ({
        ...prev,
        amount: String(existing.amount),
        mode: existing.mode || "Cash",
        transactionId: existing.transactionId || "",
        paymentDate: existing.paymentDate || prev.paymentDate,
        remark: existing.remark || "",
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentForm.groupId, paymentForm.clientId, paymentForm.month, paymentForm.year]);

  // Auto-select next unpaid installment when client is selected/changed
  useEffect(() => {
    if (!paymentForm.groupId || !paymentForm.clientId) return;
    const group = data.groups.find(g => g._id === paymentForm.groupId);
    if (!group) return;
    const timeline = getGroupTimeline(group);
    const clientPayments = data.payments.filter(
      p => p.groupId === paymentForm.groupId && p.clientId === paymentForm.clientId
    );
    const nextUnpaid = timeline.find(slot =>
      !clientPayments.some(p => p.month === slot.month && Number(p.year) === slot.year)
    );
    if (nextUnpaid) {
      setPaymentForm(prev => ({ ...prev, month: nextUnpaid.month, year: String(nextUnpaid.year) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentForm.clientId, paymentForm.groupId]);

  // Reset to "update" mode and clear any targeted payment when the selected slot changes
  useEffect(() => {
    setPaymentAddMode("update");
    setEditTargetPaymentId(null);
  }, [paymentForm.clientId, paymentForm.groupId, paymentForm.month, paymentForm.year]);

  const filteredClients = useMemo(() => {
    const q = searchClient.toLowerCase();
    return data.clients.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.clientCode || "").toLowerCase().includes(q) ||
        (c.phones || [c.phone] || []).some((p) => (p || "").includes(q))
    );
  }, [data.clients, searchClient]);

  const filteredGroups = useMemo(() => {
    const q = searchGroup.toLowerCase();
    return data.groups.filter((g) => (g.name || "").toLowerCase().includes(q));
  }, [data.groups, searchGroup]);

  const dashboard = useMemo(() => {
    const existingGroupIds = new Set(data.groups.map((g) => g._id));

    const totalExpected = data.groups.reduce(
      (sum, g) =>
        sum +
        Number(g.monthlyAmount || 0) *
          Number(g.durationMonths || 0) *
          (g.memberIds || []).length,
      0,
    );
    const totalCollected = data.payments
      .filter((p) => existingGroupIds.has(p.groupId))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const totalPending = totalExpected - totalCollected;

    const now = new Date();
    const thisMonthTotal = data.payments
      .filter((p) => {
        const d = new Date(p.paymentDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    const recentClients = [...data.clients].slice(-6).reverse();

    const recentPayments = [...data.payments]
      .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
      .slice(0, 6)
      .map((p) => ({
        ...p,
        clientName: data.clients.find((c) => c._id === p.clientId)?.name || "—",
        groupName: data.groups.find((g) => g._id === p.groupId)?.name || "—",
      }));

    const groupStats = data.groups.map((g) => ({
      ...g,
      memberCount: (g.memberIds || []).length,
      paidCount: data.payments.filter((p) => p.groupId === g._id).length,
      expectedCount: (g.memberIds || []).length * Number(g.durationMonths || 0),
    }));

    return {
      clients: data.clients.length,
      groups: data.groups.length,
      payments: data.payments.length,
      totalExpected,
      totalCollected,
      totalPending,
      thisMonthTotal,
      recentClients,
      recentPayments,
      groupStats,
    };
  }, [data]);

  const handleAddClient = async () => {
    const filledPhones = clientForm.phones.filter((p) => p.trim() !== "");
    if (!clientForm.clientCode || !clientForm.name || filledPhones.length === 0) {
      alert("Client Code, Name, and at least one phone number are required.");
      return;
    }
    const invalid = filledPhones.find((p) => !/^\d{10}$/.test(p));
    if (invalid) {
      alert(`Phone number "${invalid}" is invalid. Each number must be exactly 10 digits.`);
      return;
    }

    try {
      const newClient = await addClient({ ...clientForm, phones: filledPhones });

      setData((prev) => ({
        ...prev,
        clients: [newClient, ...prev.clients],
      }));

      setClientForm({
        clientCode: "",
        name: "",
        phones: [""],
        email: "",
        address: "",
        notes: "",
      });
    } catch (error) {
      console.error("Error adding client:", error);
      alert("Failed to connect to the backend server. Please make sure the node server is running.");
    }
  };

  const handleAddGroup = async () => {
  if (!groupForm.groupNumber || !groupForm.name || !groupForm.monthlyAmount || !groupForm.psoNo || !groupForm.commNo) {
    alert("Group Number, Group Name, Monthly Amount, PSO No, and Comm No are required.");
    return;
  }
  const duplicate = data.groups.some(
    (g) => g.groupNumber === groupForm.groupNumber.trim()
  );
  if (duplicate) {
    alert(`Group Number "${groupForm.groupNumber}" is already used. Please enter a unique number.`);
    return;
  }

  const newGroup = await addGroup({
    ...groupForm,
    monthlyAmount: Number(groupForm.monthlyAmount),
    durationMonths: Number(groupForm.durationMonths),
    startYear: Number(groupForm.startYear),
    startMonth: groupForm.startMonth || "January",
    adminFeeAmount: Number(groupForm.adminFeeAmount) || 0,
  });

  setData((prev) => ({
    ...prev,
    groups: [newGroup, ...prev.groups]
  }));

  setGroupForm({
    groupNumber: "",
    name: "",
    monthlyAmount: "",
    durationMonths: "12",
    startMonth: "January",
    startYear: String(currentYear),
    adminFeeAmount: "",
    psoNo: "",
    commNo: "",
  });
};

  const assignClientsToGroup = async () => {
    if (!selectedGroupId || selectedClientIds.length === 0) return;

    try {
      const group = data.groups.find((g) => g._id === selectedGroupId);
      const newMemberIds = Array.from(
        new Set([...(group.memberIds || []), ...selectedClientIds]),
      );

      const updatedGroup = await updateGroupMembers(selectedGroupId, newMemberIds);

      setData((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g._id === selectedGroupId ? updatedGroup : g
        ),
      }));
      setSelectedClientIds([]);
    } catch (error) {
      console.error("Error assigning clients:", error);
      alert("Failed to save client assignment to the backend database.");
    }
  };

  const handleRemoveClientFromGroup = async (groupId, clientId) => {
    try {
      const group = data.groups.find((g) => g._id === groupId);
      const newMemberIds = (group.memberIds || []).filter(id => id !== clientId);

      const updatedGroup = await updateGroupMembers(groupId, newMemberIds);

      setData((prev) => ({
        ...prev,
        groups: prev.groups.map((g) =>
          g._id === groupId ? updatedGroup : g
        ),
      }));
    } catch (error) {
      console.error("Error removing client:", error);
      alert("Failed to remove client from the backend database.");
    }
  };

  const recordPayment = async (existing) => {
    if (!paymentForm.groupId || !paymentForm.clientId || !paymentForm.amount || !paymentForm.month) return;
    try {
      const payload = { ...paymentForm, amount: Number(paymentForm.amount), year: Number(paymentForm.year) };
      if (existing) {
        const updated = await updatePaymentApi(existing._id, payload);
        setData((prev) => ({ ...prev, payments: prev.payments.map((p) => p._id === updated._id ? updated : p) }));
      } else {
        const newPayment = await addPaymentApi(payload);
        setData((prev) => ({ ...prev, payments: [newPayment, ...prev.payments] }));
      }
      setPaymentForm((prev) => ({ ...prev, amount: "", transactionId: "", remark: "" }));
      setEditTargetPaymentId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save payment.");
    }
  };

  const handleDeleteClient = async (id) => {
    await deleteClient(id);

    setData((prev) => ({
      ...prev,
      clients: prev.clients.filter((c) => c._id !== id)
    }));
  };

  const handleDeleteGroup = async (id) => {
    await deleteGroup(id);

    setData((prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g._id !== id)
    }));
  };

  const handleSaveEditClient = async () => {
    const filledPhones = (editClientForm.phones || []).filter((p) => p.trim() !== "");
    const invalid = filledPhones.find((p) => !/^\d{10}$/.test(p));
    if (invalid) {
      alert(`Phone number "${invalid}" must be exactly 10 digits.`);
      return;
    }
    try {
      const updated = await updateClient(editClientDialog._id, { ...editClientForm, phones: filledPhones });
      setData((prev) => ({ ...prev, clients: prev.clients.map((c) => c._id === updated._id ? updated : c) }));
      setEditClientDialog(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update client.");
    }
  };

  const handleSaveEditGroup = async () => {
    if (!editGroupForm.groupNumber || !editGroupForm.name || !editGroupForm.monthlyAmount) {
      alert("Group Number, Name, and Monthly Amount are required.");
      return;
    }
    const duplicate = data.groups.find(
      (g) => g.groupNumber === editGroupForm.groupNumber.trim() && g._id !== editGroupDialog._id
    );
    if (duplicate) {
      alert(`Group Number "${editGroupForm.groupNumber}" is already used by another group.`);
      return;
    }
    try {
      const updated = await updateGroup(editGroupDialog._id, {
        ...editGroupForm,
        monthlyAmount: Number(editGroupForm.monthlyAmount),
        durationMonths: Number(editGroupForm.durationMonths),
        startYear: Number(editGroupForm.startYear),
        adminFeeAmount: Number(editGroupForm.adminFeeAmount) || 0,
      });
      setData((prev) => ({ ...prev, groups: prev.groups.map((g) => g._id === updated._id ? updated : g) }));
      setEditGroupDialog(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update group.");
    }
  };

  const handleDeleteInstallment = async () => {
    if (!editingSlot) return;
    const existing = data.installments.find(
      (i) => i.groupId === editingSlot.groupId && i.installmentNo === editingSlot.installmentNo
    );
    if (!existing) {
      setEditInstDialog(false);
      return;
    }
    if (!window.confirm("Remove this installment record?")) return;
    try {
      await deleteInstallmentApi(existing._id);
      setData((prev) => ({
        ...prev,
        installments: prev.installments.filter((i) => i._id !== existing._id),
      }));
      setEditInstDialog(false);
    } catch (err) {
      console.error(err);
      alert("Failed to delete installment.");
    }
  };

  const handleSaveInstallment = async () => {
    if (!editingSlot) return;
    const payload = {
      groupId: editingSlot.groupId,
      installmentNo: editingSlot.installmentNo,
      month: editingSlot.month,
      year: editingSlot.year,
      winnerId: instEditForm.winnerId === "__none__" ? "" : instEditForm.winnerId,
      dividend: Number(instEditForm.dividend) || 0,
      payableAmount: Number(instEditForm.payableAmount) || 0,
    };
    try {
      const saved = await saveInstallmentApi(payload);
      setData((prev) => {
        const others = prev.installments.filter(
          (i) => !(i.groupId === payload.groupId && i.installmentNo === payload.installmentNo)
        );
        return { ...prev, installments: [...others, saved] };
      });
      setEditInstDialog(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save installment.");
    }
  };

  const handleDocUpload = async (installmentId, files) => {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    for (const file of files) formData.append("documents", file);
    try {
      const updated = await uploadInstallmentDocs(installmentId, formData);
      setData(prev => ({
        ...prev,
        installments: prev.installments.map(i => i._id === installmentId ? updated : i),
      }));
    } catch (err) {
      alert("Failed to upload: " + err.message);
    }
  };

  const handleDeleteDoc = async () => {
    const { installmentId, docId } = deleteDocConfirm;
    try {
      const updated = await deleteInstallmentDoc(installmentId, docId);
      setData(prev => ({
        ...prev,
        installments: prev.installments.map(i => i._id === installmentId ? updated : i),
      }));
      setDeleteDocConfirm(null);
    } catch (err) {
      alert("Failed to delete document: " + err.message);
    }
  };

  const selectedGroupTimeline = useMemo(() => {
    const group = data.groups.find(g => g._id === paymentForm.groupId);
    if (!group) return [];
    return getGroupTimeline(group);
  }, [data.groups, paymentForm.groupId]);

  const existingPayment = useMemo(() => {
    // If user clicked Edit on a specific payment, target that one directly
    if (editTargetPaymentId) {
      return data.payments.find((p) => p._id === editTargetPaymentId) || null;
    }
    if (!paymentForm.groupId || !paymentForm.clientId || !paymentForm.month || !paymentForm.year) return null;
    return data.payments.find(
      (p) =>
        p.groupId === paymentForm.groupId &&
        p.clientId === paymentForm.clientId &&
        p.month === paymentForm.month &&
        Number(p.year) === Number(paymentForm.year)
    ) || null;
  }, [data.payments, editTargetPaymentId, paymentForm.groupId, paymentForm.clientId, paymentForm.month, paymentForm.year]);

  // All payments recorded for the currently selected client + month slot
  const allSlotPayments = useMemo(() => {
    if (!paymentForm.groupId || !paymentForm.clientId || !paymentForm.month || !paymentForm.year) return [];
    return data.payments.filter(
      (p) =>
        p.groupId === paymentForm.groupId &&
        p.clientId === paymentForm.clientId &&
        p.month === paymentForm.month &&
        Number(p.year) === Number(paymentForm.year)
    );
  }, [data.payments, paymentForm.groupId, paymentForm.clientId, paymentForm.month, paymentForm.year]);

  // Scheduled amount (monthlyAmount - dividend) for the selected installment slot
  const selectedSlotScheduled = useMemo(() => {
    if (!paymentForm.groupId || !paymentForm.month || !paymentForm.year) return null;
    const grp = data.groups.find((g) => g._id === paymentForm.groupId);
    if (!grp) return null;
    const tl = getGroupTimeline(grp);
    const slot = tl.find((t) => t.month === paymentForm.month && t.year.toString() === paymentForm.year.toString());
    if (!slot) return null;
    const inst = data.installments.find((i) => i.groupId === paymentForm.groupId && i.installmentNo === slot.installmentNo);
    const base = Number(grp.monthlyAmount || 0);
    const div = inst ? Number(inst.dividend || 0) : 0;
    return base > 0 ? base - div : null;
  }, [paymentForm.groupId, paymentForm.month, paymentForm.year, data.groups, data.installments]);

  const groupMembers = useMemo(() => {
    const group = data.groups.find((g) => g._id === paymentForm.groupId);
    if (!group) return [];
    return (group.memberIds || [])
      .map((id) => data.clients.find((c) => c._id === id))
      .filter(Boolean);
  }, [data.clients, data.groups, paymentForm.groupId]);

  // ── Auth helpers ──────────────────────────────────────────────────────────
  const isSuperAdmin = currentUser?.role === "superadmin";
  const canDo = (section, action) => {
    if (!currentUser) return false;
    if (isSuperAdmin) return true;
    return !!currentUser.permissions?.[section]?.[action];
  };

  const handleLogin = async () => {
    setLoginError("");
    try {
      const user = await loginUser(loginForm.username, loginForm.password);
      setCurrentUser(user);
      localStorage.setItem("chitfund_user", JSON.stringify(user));
      localStorage.setItem("chitfund_session_version", SESSION_VERSION);
      setLoginForm({ username: "", password: "" });
    } catch (err) {
      setLoginError(err.message || "Invalid username or password");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("chitfund_user");
    setShowProfileMenu(false);
    setActiveTab("dashboard");
  };

  const idleTimerRef = useRef(null);
  const IDLE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

  useEffect(() => {
    if (!currentUser) return;

    const resetTimer = () => {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        handleLogout();
      }, IDLE_TIMEOUT_MS);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(idleTimerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [currentUser]);

  useEffect(() => {
    if (activeTab !== "dashboard" || dashPaused) return;
    const t = setInterval(() => setDashSlide((s) => (s + 1) % 3), 4000);
    return () => clearInterval(t);
  }, [activeTab, dashPaused]);

  const openUserMgmt = async () => {
    setShowProfileMenu(false);
    const users = await getUsers();
    setUserList(users);
    setShowUserMgmt(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.username || !userForm.password) { alert("Username and password required."); return; }
    try {
      if (editingUser) {
        const updated = await updateUserApi(editingUser._id, userForm);
        setUserList(prev => prev.map(u => u._id === editingUser._id ? updated : u));
      } else {
        const created = await addUser(userForm);
        setUserList(prev => [...prev, created]);
      }
      setUserForm(null); setEditingUser(null);
    } catch (err) { alert(err.message); }
  };

  const handleDeleteUser = async () => {
    await deleteUserApi(deleteUserConfirm._id);
    setUserList(prev => prev.filter(u => u._id !== deleteUserConfirm._id));
    setDeleteUserConfirm(null);
  };

  const draggedIdxRef = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const handleMemberDrop = async (dropIdx) => {
    const fromIdx = draggedIdxRef.current;
    setDragOverIdx(null);
    draggedIdxRef.current = null;
    if (fromIdx === null || fromIdx === dropIdx) return;
    const group = data.groups.find((g) => g._id === paymentForm.groupId);
    if (!group) return;
    const newMemberIds = [...(group.memberIds || [])];
    const [moved] = newMemberIds.splice(fromIdx, 1);
    newMemberIds.splice(dropIdx, 0, moved);
    setData((prev) => ({
      ...prev,
      groups: prev.groups.map((g) =>
        g._id === paymentForm.groupId ? { ...g, memberIds: newMemberIds } : g
      ),
    }));
    try {
      await updateGroupMembers(paymentForm.groupId, newMemberIds);
    } catch (err) {
      alert("Failed to save order: " + err.message);
    }
  };

  // Drag state for Assigned Clients table in Group Management (scoped per group)
  const grpDragRef = useRef({ groupId: null, fromIdx: null });
  const [grpDragOver, setGrpDragOver] = useState({ groupId: null, idx: null });

  const handleGroupClientDrop = async (group, dropIdx) => {
    const { groupId, fromIdx } = grpDragRef.current;
    setGrpDragOver({ groupId: null, idx: null });
    grpDragRef.current = { groupId: null, fromIdx: null };
    if (!groupId || fromIdx === null || fromIdx === dropIdx) return;
    const newMemberIds = [...(group.memberIds || [])];
    const [moved] = newMemberIds.splice(fromIdx, 1);
    newMemberIds.splice(dropIdx, 0, moved);
    setData((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => g._id === groupId ? { ...g, memberIds: newMemberIds } : g),
    }));
    try {
      await updateGroupMembers(groupId, newMemberIds);
    } catch (err) {
      alert("Failed to save order: " + err.message);
    }
  };

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3">
            <img src={LOGO_B64} alt="Logo" className="h-20 w-20 object-contain" />
            <div className="text-center">
              <h1 className="text-2xl font-bold tracking-tight">AKNITH CHITS</h1>
              <p className="text-sm text-slate-500">Chit Fund Management System</p>
            </div>
          </div>
          <Card className="rounded-2xl border-0 shadow-md">
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label>Username</Label>
                <Input
                  placeholder="Enter username"
                  value={loginForm.username}
                  onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                  autoFocus
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={loginForm.password}
                  onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && handleLogin()}
                />
              </div>
              {loginError && <p className="text-sm text-red-500 font-medium">{loginError}</p>}
              <Button className="w-full rounded-xl" onClick={handleLogin}>
                Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-6">
      <div className="w-full min-h-screen p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Chit Fund Management
            </h1>
            <p className="text-slate-600">
              Manage clients, create groups, assign existing members, and track
              monthly payments for one year.
            </p>
          </div>
          <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShowProfileMenu(false); }}>
            <button
              className="flex items-center gap-2 rounded-full bg-slate-100 hover:bg-slate-200 px-4 py-2 text-sm font-medium transition-colors"
              onClick={() => setShowProfileMenu(p => !p)}
            >
              <div className="h-7 w-7 rounded-full bg-green-700 text-white text-xs font-bold flex items-center justify-center">
                {(currentUser.displayName || currentUser.username || "U")[0].toUpperCase()}
              </div>
              <span>{currentUser.displayName || currentUser.username}</span>
              <span className="text-[10px] text-slate-400">{isSuperAdmin ? "Super Admin" : "Operator"}</span>
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 top-12 z-50 w-48 rounded-xl border bg-white shadow-lg py-1">
                <div className="px-4 py-2 border-b">
                  <p className="text-xs font-semibold">{currentUser.displayName || currentUser.username}</p>
                  <p className="text-[11px] text-slate-400">{isSuperAdmin ? "Super Admin" : "Operator"}</p>
                </div>
                {isSuperAdmin && (
                  <button
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors"
                    onClick={openUserMgmt}
                  >
                    Manage Users
                  </button>
                )}
                <button
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </motion.div>

        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Total Clients", value: dashboard.clients, icon: Users },
            { title: "Total Groups", value: dashboard.groups, icon: Layers3 },
            {
              title: "Collected Amount",
              value: formatCurrency(dashboard.totalCollected),
              icon: Wallet,
            },
            {
              title: "Pending Amount",
              value: formatCurrency(dashboard.totalPending),
              icon: AlertCircle,
            },
          ].map((item) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-sm text-slate-500">{item.title}</p>
                    <h3 className="mt-2 text-2xl font-semibold">
                      {item.value}
                    </h3>
                  </div>
                  <div className="rounded-2xl bg-slate-100 p-3">
                    <item.icon className="h-6 w-6" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full gap-2 rounded-2xl bg-white p-2 shadow-sm flex-wrap">
            {[
              { value: "dashboard", label: "Dashboard", show: true },
              { value: "clients",   label: "Clients",   show: canDo("clients","view") },
              { value: "groups",    label: "Groups",    show: canDo("groups","view") },
              { value: "payments",  label: "Payments",  show: canDo("payments","view") },
              { value: "reports",   label: "Reports",   show: canDo("reports","view") },
            ].filter((t) => t.show).map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="rounded-xl flex-1 font-medium text-slate-500 transition-all data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── User Management Dialog (super admin only) ── */}
          <Dialog open={showUserMgmt} onOpenChange={o => { if (!o) { setShowUserMgmt(false); setUserForm(null); setEditingUser(null); } }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Operator Users</DialogTitle>
              </DialogHeader>
              {userForm ? (
                <div className="space-y-4 pt-2">
                  <h3 className="font-semibold">{editingUser ? "Edit Operator" : "New Operator"}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Username</Label><Input value={userForm.username} onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))} disabled={!!editingUser} /></div>
                    <div><Label>Display Name</Label><Input value={userForm.displayName || ""} onChange={e => setUserForm(f => ({ ...f, displayName: e.target.value }))} /></div>
                    <div><Label>Password</Label><Input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-3 rounded-xl border p-4">
                    <p className="text-sm font-semibold text-slate-700">Permissions</p>
                    {[
                      { key: "clients",  label: "Clients",  actions: ["view","create","edit","delete"] },
                      { key: "groups",   label: "Groups",   actions: ["view","create","edit","delete","manageMembers"] },
                      { key: "payments", label: "Payments", actions: ["view","record"] },
                      { key: "reports",  label: "Reports",  actions: ["view","editSchedule","uploadDocs"] },
                    ].map(({ key, label, actions }) => (
                      <div key={key}>
                        <p className="text-xs font-medium text-slate-500 uppercase mb-1">{label}</p>
                        <div className="flex flex-wrap gap-3">
                          {actions.map(action => (
                            <label key={action} className="flex items-center gap-1.5 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!!userForm.permissions?.[key]?.[action]}
                                onChange={e => setUserForm(f => ({ ...f, permissions: { ...f.permissions, [key]: { ...f.permissions?.[key], [action]: e.target.checked } } }))}
                              />
                              {action.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setUserForm(null); setEditingUser(null); }}>Cancel</Button>
                    <Button className="flex-1 rounded-xl" onClick={handleSaveUser}>Save</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <Button className="rounded-xl" onClick={() => setUserForm({ username: "", password: "", displayName: "", permissions: JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS)) })}>
                    <Plus className="mr-2 h-4 w-4" /> Add Operator
                  </Button>
                  {userList.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">No operators created yet.</p>
                  ) : userList.map(u => (
                    <div key={u._id} className="flex items-center justify-between rounded-xl border p-3">
                      <div>
                        <p className="font-medium text-sm">{u.displayName || u.username}</p>
                        <p className="text-xs text-slate-400">@{u.username}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingUser(u); setUserForm({ username: u.username, password: u.password, displayName: u.displayName || "", permissions: JSON.parse(JSON.stringify(u.permissions || DEFAULT_PERMISSIONS)) }); }}>
                          <Pencil className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteUserConfirm(u)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete user confirm */}
          <Dialog open={!!deleteUserConfirm} onOpenChange={o => !o && setDeleteUserConfirm(null)}>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Delete Operator?</DialogTitle></DialogHeader>
              <p className="text-sm text-slate-600">Delete operator <span className="font-semibold">{deleteUserConfirm?.displayName || deleteUserConfirm?.username}</span>? They will no longer be able to log in.</p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteUserConfirm(null)}>Cancel</Button>
                <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleDeleteUser}>Delete</Button>
              </div>
            </DialogContent>
          </Dialog>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* ── Sliding carousel ── */}
              <Card className="lg:col-span-2 rounded-2xl border-0 shadow-sm overflow-hidden" onMouseEnter={() => setDashPaused(true)} onMouseLeave={() => setDashPaused(false)}>
                {/* Slide header tabs */}
                <div className="flex border-b border-slate-100">
                  {[
                    { label: "Clients", icon: Users },
                    { label: "Payments", icon: IndianRupee },
                    { label: "Groups", icon: Layers3 },
                  ].map(({ label, icon: Icon }, idx) => (
                    <button
                      key={label}
                      onClick={() => setDashSlide(idx)}
                      className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                        dashSlide === idx
                          ? "border-b-2 border-slate-900 text-slate-900"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Slide body */}
                <CardContent className="p-0">
                  {/* Slide 0: Recent Clients */}
                  {dashSlide === 0 && (
                    <motion.div key="clients" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="divide-y divide-slate-50">
                      {dashboard.recentClients.length === 0 ? (
                        <p className="py-10 text-center text-sm text-slate-400">No clients added yet.</p>
                      ) : dashboard.recentClients.map((c) => (
                        <div key={c._id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                            {(c.name || "?")[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{c.name}</p>
                            <p className="text-xs text-slate-400">{c.clientCode} · {(c.phones?.[0] || c.phone || "—")}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-300" />
                        </div>
                      ))}
                      {data.clients.length > 6 && (
                        <p className="py-2 text-center text-xs text-slate-400">+{data.clients.length - 6} more clients</p>
                      )}
                    </motion.div>
                  )}

                  {/* Slide 1: Recent Payments */}
                  {dashSlide === 1 && (
                    <motion.div key="payments" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="divide-y divide-slate-50">
                      {dashboard.recentPayments.length === 0 ? (
                        <p className="py-10 text-center text-sm text-slate-400">No payments recorded yet.</p>
                      ) : dashboard.recentPayments.map((p) => (
                        <div key={p._id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                            <IndianRupee className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{p.clientName}</p>
                            <p className="text-xs text-slate-400">{p.groupName} · {p.month} {p.year}</p>
                          </div>
                          <span className="text-sm font-semibold text-green-700">{formatCurrency(Number(p.amount))}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {/* Slide 2: Groups Status */}
                  {dashSlide === 2 && (
                    <motion.div key="groups" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="divide-y divide-slate-50">
                      {dashboard.groupStats.length === 0 ? (
                        <p className="py-10 text-center text-sm text-slate-400">No groups created yet.</p>
                      ) : dashboard.groupStats.map((g) => {
                        const pct = g.expectedCount > 0 ? Math.min(100, Math.round((g.paidCount / g.expectedCount) * 100)) : 0;
                        return (
                          <div key={g._id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="font-medium text-sm">{g.name}</p>
                              <span className="text-xs text-slate-400">{g.memberCount} members · {g.durationMonths}m</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-2 rounded-full bg-slate-800 transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs font-medium text-slate-500 w-8 text-right">{pct}%</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{g.paidCount} / {g.expectedCount} payments · {formatCurrency(Number(g.monthlyAmount || 0))}/mo</p>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </CardContent>

                {/* Dot navigation */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-50">
                  <button onClick={() => setDashSlide((s) => (s + 2) % 3)} className="rounded-lg p-1 hover:bg-slate-100 transition-colors">
                    <ChevronLeft className="h-4 w-4 text-slate-400" />
                  </button>
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <button key={i} onClick={() => setDashSlide(i)} className={`h-2 rounded-full transition-all ${dashSlide === i ? "w-6 bg-slate-800" : "w-2 bg-slate-200"}`} />
                    ))}
                  </div>
                  <button onClick={() => setDashSlide((s) => (s + 1) % 3)} className="rounded-lg p-1 hover:bg-slate-100 transition-colors">
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </Card>

              {/* ── Collection summary panel ── */}
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-slate-600" /> Collection
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>Collected</span>
                      <span>{dashboard.totalExpected > 0 ? Math.round((dashboard.totalCollected / dashboard.totalExpected) * 100) : 0}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-3 rounded-full bg-slate-800 transition-all"
                        style={{ width: `${dashboard.totalExpected > 0 ? Math.min(100, (dashboard.totalCollected / dashboard.totalExpected) * 100) : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs font-semibold text-slate-700">{formatCurrency(dashboard.totalCollected)}</span>
                      <span className="text-xs text-slate-400">{formatCurrency(dashboard.totalExpected)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      { label: "This Month", value: formatCurrency(dashboard.thisMonthTotal), accent: true },
                      { label: "Pending", value: formatCurrency(dashboard.totalPending) },
                      { label: "Total Payments", value: `${dashboard.payments} entries` },
                      { label: "Active Groups", value: `${dashboard.groups} groups` },
                      { label: "Current Year", value: String(currentYear) },
                    ].map(({ label, value, accent }) => (
                      <div key={label} className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${accent ? "bg-slate-900 text-white" : "bg-slate-50"}`}>
                        <span className={`text-xs ${accent ? "text-slate-300" : "text-slate-500"}`}>{label}</span>
                        <span className={`text-sm font-semibold ${accent ? "text-white" : "text-slate-800"}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            {/* Delete client confirmation */}
            <Dialog
              open={!!deleteClientConfirm}
              onOpenChange={(open) => { if (!open) setDeleteClientConfirm(null); }}
            >
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Delete Client</DialogTitle>
                </DialogHeader>
                {deleteClientConfirm && (
                  <div className="space-y-4 pt-1">
                    <div className="rounded-xl bg-slate-50 divide-y divide-slate-200 overflow-hidden text-sm">
                      {deleteClientConfirm.clientCode && (
                        <div className="flex justify-between px-4 py-2.5">
                          <span className="text-slate-500">Client Code</span>
                          <span className="font-mono font-bold">{deleteClientConfirm.clientCode}</span>
                        </div>
                      )}
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-500">Name</span>
                        <span className="font-semibold">{deleteClientConfirm.name}</span>
                      </div>
                      {(deleteClientConfirm.phones?.length ? deleteClientConfirm.phones : [deleteClientConfirm.phone]).filter(Boolean).map((p, i) => (
                        <div key={i} className="flex justify-between px-4 py-2.5">
                          <span className="text-slate-500">{i === 0 ? "Phone" : `Phone ${i + 1}`}</span>
                          <span className="font-semibold">{p}</span>
                        </div>
                      ))}
                      {deleteClientConfirm.email && (
                        <div className="flex justify-between px-4 py-2.5">
                          <span className="text-slate-500">Email</span>
                          <span className="font-semibold">{deleteClientConfirm.email}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-red-500 font-medium">
                      This will permanently delete the client. Payment records linked to this client will remain in the database.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl"
                        onClick={() => setDeleteClientConfirm(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 rounded-xl"
                        onClick={async () => {
                          const id = deleteClientConfirm._id;
                          setDeleteClientConfirm(null);
                          await handleDeleteClient(id);
                        }}
                      >
                        Yes, Delete
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Edit client dialog */}
            <Dialog open={!!editClientDialog} onOpenChange={(open) => { if (!open) setEditClientDialog(null); }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Client</DialogTitle>
                </DialogHeader>
                {editClientForm && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <Label>Client Code</Label>
                      <Input value={editClientForm.clientCode} onChange={(e) => setEditClientForm({ ...editClientForm, clientCode: e.target.value })} />
                    </div>
                    <div>
                      <Label>Name</Label>
                      <Input value={editClientForm.name} onChange={(e) => setEditClientForm({ ...editClientForm, name: e.target.value })} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label>Phone Number(s)</Label>
                        {editClientForm.phones.length < 3 && (
                          <button type="button" className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            onClick={() => setEditClientForm({ ...editClientForm, phones: [...editClientForm.phones, ""] })}>
                            + Add number
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {editClientForm.phones.map((ph, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              value={ph}
                              maxLength={10}
                              inputMode="numeric"
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                const updated = [...editClientForm.phones];
                                updated[idx] = val;
                                setEditClientForm({ ...editClientForm, phones: updated });
                              }}
                              placeholder={idx === 0 ? "Primary (10 digits)" : `Alternate ${idx}`}
                              className={ph && ph.length !== 10 ? "border-red-400" : ""}
                            />
                            {ph.length > 0 && ph.length !== 10 && <span className="text-xs text-red-500 whitespace-nowrap">{ph.length}/10</span>}
                            {idx > 0 && (
                              <button type="button" className="text-slate-400 hover:text-red-500"
                                onClick={() => setEditClientForm({ ...editClientForm, phones: editClientForm.phones.filter((_, i) => i !== idx) })}>
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={editClientForm.email} onChange={(e) => setEditClientForm({ ...editClientForm, email: e.target.value })} />
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Input value={editClientForm.address} onChange={(e) => setEditClientForm({ ...editClientForm, address: e.target.value })} />
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input value={editClientForm.notes} onChange={(e) => setEditClientForm({ ...editClientForm, notes: e.target.value })} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditClientDialog(null)}>Cancel</Button>
                      <Button className="flex-1 rounded-xl" onClick={handleSaveEditClient}>Save Changes</Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
              {canDo("clients","create") && (
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Add Client</CardTitle>
                  <CardDescription>
                    Clients must be created here before adding to any group
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Client Code</Label>
                    <Input
                      value={clientForm.clientCode}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          clientCode: e.target.value,
                        })
                      }
                      placeholder="CL003"
                    />
                  </div>
                  <div>
                    <Label>Client Name</Label>
                    <Input
                      value={clientForm.name}
                      onChange={(e) =>
                        setClientForm({ ...clientForm, name: e.target.value })
                      }
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label>Phone Number(s)</Label>
                      {clientForm.phones.length < 3 && (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                          onClick={() =>
                            setClientForm({ ...clientForm, phones: [...clientForm.phones, ""] })
                          }
                        >
                          <span className="text-base leading-none">+</span> Add number
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {clientForm.phones.map((ph, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input
                            value={ph}
                            maxLength={10}
                            inputMode="numeric"
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                              const updated = [...clientForm.phones];
                              updated[idx] = val;
                              setClientForm({ ...clientForm, phones: updated });
                            }}
                            placeholder={idx === 0 ? "Primary (10 digits)" : `Alternate ${idx}`}
                            className={ph && ph.length !== 10 ? "border-red-400 focus-visible:ring-red-400" : ""}
                          />
                          {ph.length > 0 && ph.length !== 10 && (
                            <span className="text-xs text-red-500 whitespace-nowrap">{ph.length}/10</span>
                          )}
                          {idx > 0 && (
                            <button
                              type="button"
                              className="text-slate-400 hover:text-red-500 transition-colors"
                              onClick={() => {
                                const updated = clientForm.phones.filter((_, i) => i !== idx);
                                setClientForm({ ...clientForm, phones: updated });
                              }}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={clientForm.email}
                      onChange={(e) =>
                        setClientForm({ ...clientForm, email: e.target.value })
                      }
                      placeholder="client@example.com"
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      value={clientForm.address}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          address: e.target.value,
                        })
                      }
                      placeholder="City / Address"
                    />
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      value={clientForm.notes}
                      onChange={(e) =>
                        setClientForm({ ...clientForm, notes: e.target.value })
                      }
                      placeholder="Optional notes"
                    />
                  </div>
                  <Button
                    className="w-full rounded-xl"
                    onClick={handleAddClient}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Client
                  </Button>
                </CardContent>
              </Card>
              )}

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Client Database</CardTitle>
                    <CardDescription>
                      Search, review, and maintain all registered clients
                    </CardDescription>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      placeholder="Search by name, code, phone"
                      value={searchClient}
                      onChange={(e) => setSearchClient(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-2xl border min-h-[1000px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClients.length > 0 ? (
                          filteredClients.map((client) => (
                            <TableRow key={client._id}>
                              <TableCell className="font-medium">
                                {client.clientCode}
                              </TableCell>
                              <TableCell>{client.name}</TableCell>
                              <TableCell>
                                <div className="space-y-0.5">
                                  {(client.phones?.length ? client.phones : [client.phone]).filter(Boolean).map((p, i) => (
                                    <div key={i} className="text-sm">
                                      {i > 0 && <span className="text-slate-400 text-xs mr-1">Alt:</span>}
                                      {p}
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>{client.email || "-"}</TableCell>
                              <TableCell>{client.address || "-"}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  {canDo("clients","edit") && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setEditClientDialog(client);
                                      setEditClientForm({
                                        clientCode: client.clientCode || "",
                                        name: client.name || "",
                                        phones: client.phones?.length ? [...client.phones] : [client.phone || ""],
                                        email: client.email || "",
                                        address: client.address || "",
                                        notes: client.notes || "",
                                      });
                                    }}
                                  >
                                    <Pencil className="h-4 w-4 text-blue-500" />
                                  </Button>
                                  )}
                                  {canDo("clients","delete") && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteClientConfirm(client)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center text-slate-500"
                            >
                              No clients found.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            {/* Remove client from group confirmation */}
            <Dialog
              open={!!removeClientConfirm}
              onOpenChange={(open) => { if (!open) setRemoveClientConfirm(null); }}
            >
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Remove Client from Group</DialogTitle>
                </DialogHeader>
                {removeClientConfirm && (
                  <div className="space-y-4 pt-1">
                    <div className="rounded-xl bg-slate-50 divide-y divide-slate-200 overflow-hidden text-sm">
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-500">Client</span>
                        <span className="font-semibold">{removeClientConfirm.clientName}</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-500">Group</span>
                        <span className="font-semibold">{removeClientConfirm.groupName}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">
                      This will remove the client from the group. Existing payment records will not be deleted.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl"
                        onClick={() => setRemoveClientConfirm(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 rounded-xl"
                        onClick={async () => {
                          const { groupId, clientId } = removeClientConfirm;
                          setRemoveClientConfirm(null);
                          await handleRemoveClientFromGroup(groupId, clientId);
                        }}
                      >
                        Yes, Remove
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Delete group confirmation */}
            <Dialog
              open={!!deleteGroupConfirm}
              onOpenChange={(open) => { if (!open) setDeleteGroupConfirm(null); }}
            >
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Delete Group</DialogTitle>
                </DialogHeader>
                {deleteGroupConfirm && (
                  <div className="space-y-4 pt-1">
                    <div className="rounded-xl bg-slate-50 divide-y divide-slate-200 overflow-hidden text-sm">
                      {deleteGroupConfirm.groupNumber && (
                        <div className="flex justify-between px-4 py-2.5">
                          <span className="text-slate-500">Group Number</span>
                          <span className="font-mono font-bold text-blue-700">#{deleteGroupConfirm.groupNumber}</span>
                        </div>
                      )}
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-500">Group Name</span>
                        <span className="font-semibold">{deleteGroupConfirm.name}</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-500">Monthly Amount</span>
                        <span className="font-semibold">{formatCurrency(deleteGroupConfirm.monthlyAmount)}</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-500">Duration</span>
                        <span className="font-semibold">{deleteGroupConfirm.durationMonths} months</span>
                      </div>
                      <div className="flex justify-between px-4 py-2.5">
                        <span className="text-slate-500">Members</span>
                        <span className="font-semibold">{(deleteGroupConfirm.memberIds || []).length}</span>
                      </div>
                    </div>
                    <p className="text-sm text-red-500 font-medium">
                      This will permanently delete the group. Payment records linked to this group will remain in the database.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 rounded-xl"
                        onClick={() => setDeleteGroupConfirm(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1 rounded-xl"
                        onClick={async () => {
                          const id = deleteGroupConfirm._id;
                          setDeleteGroupConfirm(null);
                          await handleDeleteGroup(id);
                        }}
                      >
                        Yes, Delete
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Edit group dialog */}
            <Dialog open={!!editGroupDialog} onOpenChange={(open) => { if (!open) setEditGroupDialog(null); }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Group</DialogTitle>
                </DialogHeader>
                {editGroupForm && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <Label>Group Number</Label>
                      <Input className="font-mono" value={editGroupForm.groupNumber} onChange={(e) => setEditGroupForm({ ...editGroupForm, groupNumber: e.target.value })} />
                    </div>
                    <div>
                      <Label>Group Name</Label>
                      <Input value={editGroupForm.name} onChange={(e) => setEditGroupForm({ ...editGroupForm, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Monthly Amount (₹)</Label>
                        <Input type="number" value={editGroupForm.monthlyAmount} onChange={(e) => setEditGroupForm({ ...editGroupForm, monthlyAmount: e.target.value })} />
                      </div>
                      <div>
                        <Label>Duration (months)</Label>
                        <Input type="number" value={editGroupForm.durationMonths} onChange={(e) => setEditGroupForm({ ...editGroupForm, durationMonths: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Start Month</Label>
                        <Select value={editGroupForm.startMonth} onValueChange={(v) => setEditGroupForm({ ...editGroupForm, startMonth: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Start Year</Label>
                        <Input type="number" value={editGroupForm.startYear} onChange={(e) => setEditGroupForm({ ...editGroupForm, startYear: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <Label>Admin Fee — 1st Month Only (₹)</Label>
                      <Input type="number" value={editGroupForm.adminFeeAmount} onChange={(e) => setEditGroupForm({ ...editGroupForm, adminFeeAmount: e.target.value })} placeholder="0" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>PSO No</Label>
                        <Input value={editGroupForm.psoNo || ""} onChange={(e) => setEditGroupForm({ ...editGroupForm, psoNo: e.target.value })} placeholder="e.g. 14/2026" />
                      </div>
                      <div>
                        <Label>Comm No</Label>
                        <Input value={editGroupForm.commNo || ""} onChange={(e) => setEditGroupForm({ ...editGroupForm, commNo: e.target.value })} placeholder="e.g. 16/2026" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setEditGroupDialog(null)}>Cancel</Button>
                      <Button className="flex-1 rounded-xl" onClick={handleSaveEditGroup}>Save Changes</Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
              <div className="space-y-6">
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Create Group</CardTitle>
                    <CardDescription>
                      Define monthly amount and one-year cycle
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* 1. Group Name */}
                    <div>
                      <Label>Group Name</Label>
                      <Input
                        value={groupForm.name}
                        onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                        placeholder="Silver Batch A"
                      />
                    </div>
                    {/* 2. Group Number */}
                    <div>
                      <Label>
                        Group Number{" "}
                        <span className="text-xs font-normal text-slate-400">(unique ID, e.g. 10001)</span>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={groupForm.groupNumber}
                          onChange={(e) => setGroupForm({ ...groupForm, groupNumber: e.target.value })}
                          placeholder="e.g. 10001"
                          className="font-mono"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => {
                            const nums = data.groups
                              .map((g) => parseInt(g.groupNumber, 10))
                              .filter((n) => !isNaN(n));
                            const next = nums.length > 0 ? Math.max(...nums) + 1 : 10001;
                            setGroupForm({ ...groupForm, groupNumber: String(next) });
                          }}
                        >
                          Auto
                        </Button>
                      </div>
                    </div>
                    {/* 3. PSO No / Comm No */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>PSO No <span className="text-red-500">*</span></Label>
                        <Input
                          value={groupForm.psoNo}
                          onChange={(e) => setGroupForm({ ...groupForm, psoNo: e.target.value })}
                          placeholder="e.g. 14/2026"
                        />
                      </div>
                      <div>
                        <Label>Comm No <span className="text-red-500">*</span></Label>
                        <Input
                          value={groupForm.commNo}
                          onChange={(e) => setGroupForm({ ...groupForm, commNo: e.target.value })}
                          placeholder="e.g. 16/2026"
                        />
                      </div>
                    </div>
                    {/* 4. Monthly Amount */}
                    <div>
                      <Label>Monthly Amount</Label>
                      <Input
                        type="number"
                        value={groupForm.monthlyAmount}
                        onChange={(e) => setGroupForm({ ...groupForm, monthlyAmount: e.target.value })}
                        placeholder="5000"
                      />
                    </div>
                    {/* 5. Duration */}
                    <div>
                      <Label>Duration in Months</Label>
                      <Input
                        type="number"
                        value={groupForm.durationMonths}
                        onChange={(e) => setGroupForm({ ...groupForm, durationMonths: e.target.value })}
                        placeholder="12"
                      />
                    </div>
                    {/* 6. Start Month / Start Year */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Start Month</Label>
                        <Select
                          value={groupForm.startMonth}
                          onValueChange={(value) => setGroupForm({ ...groupForm, startMonth: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map((month) => (
                              <SelectItem key={month} value={month}>{month}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Start Year</Label>
                        <Input
                          type="number"
                          value={groupForm.startYear}
                          onChange={(e) => setGroupForm({ ...groupForm, startYear: e.target.value })}
                          placeholder={String(currentYear)}
                        />
                      </div>
                    </div>
                    {/* 7. Admin Fee */}
                    <div>
                      <Label>Admin Fee — 1st Month Only (₹)</Label>
                      <Input
                        type="number"
                        value={groupForm.adminFeeAmount}
                        onChange={(e) => setGroupForm({ ...groupForm, adminFeeAmount: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <Button className="w-full rounded-xl" onClick={handleAddGroup}>
                      Create Group
                    </Button>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle>Add Existing Clients to Group</CardTitle>
                    <CardDescription>
                      Only clients from the client database can be assigned
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Select Group</Label>
                      <Select
                        value={selectedGroupId}
                        onValueChange={setSelectedGroupId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose group" />
                        </SelectTrigger>
                        <SelectContent>
                          {data.groups.map((group) => (
                            <SelectItem key={group._id} value={group._id}>
                              {group.groupNumber ? `#${group.groupNumber} — ` : ""}{group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        className="pl-9"
                        placeholder="Search client by name or code…"
                        value={searchAssignClient}
                        onChange={(e) => setSearchAssignClient(e.target.value)}
                      />
                    </div>
                    <div className="h-[500px] space-y-3 overflow-auto rounded-2xl border p-4">
                      {data.clients.length > 0 ? (
                        data.clients
                          .filter((c) => {
                            const q = searchAssignClient.toLowerCase();
                            return !q ||
                              (c.name || "").toLowerCase().includes(q) ||
                              (c.clientCode || "").toLowerCase().includes(q);
                          })
                          .map((client) => (
                          <div
                            key={client._id}
                            className="flex items-center gap-3"
                          >
                            <Checkbox
                              checked={selectedClientIds.includes(client._id)}
                              onCheckedChange={(checked) => {
                                setSelectedClientIds((prev) =>
                                  checked
                                    ? [...prev, client._id]
                                    : prev.filter((id) => id !== client._id),
                                );
                              }}
                            />
                            <div>
                              <p className="text-sm font-medium">
                                {client.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {client.clientCode} • {client.phone}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          Add clients first.
                        </p>
                      )}
                    </div>
                    {canDo("groups","manageMembers") && (
                    <Button
                      className="w-full rounded-xl"
                      onClick={assignClientsToGroup}
                    >
                      Assign Selected Clients
                    </Button>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle>Group Management</CardTitle>
                    <CardDescription>
                      Track group structure and member count
                    </CardDescription>
                  </div>
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      className="pl-9"
                      placeholder="Search group name"
                      value={searchGroup}
                      onChange={(e) => setSearchGroup(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filteredGroups.map((group) => {
                    const members = (group.memberIds || [])
                      .map((id) => data.clients.find((c) => c._id === id))
                      .filter(Boolean);
                    const groupCollected = data.payments
                      .filter((p) => p.groupId === group._id)
                      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
                    const expectedPerMonth = Number(group.monthlyAmount || 0) * members.length;
                    const totalExpectedGroup = expectedPerMonth * Number(group.durationMonths || 0);
                    const groupPending = totalExpectedGroup - groupCollected;
                    return (
                      <div key={group._id} className="rounded-2xl border p-5">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-semibold">{group.name}</h3>
                              {group.groupNumber && (
                                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-mono font-bold text-blue-700 border border-blue-200">
                                  #{group.groupNumber}
                                </span>
                              )}
                              {group.psoNo && (
                                <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-mono font-semibold text-purple-700 border border-purple-200">
                                  PSO: {group.psoNo}
                                </span>
                              )}
                              {group.commNo && (
                                <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-mono font-semibold text-teal-700 border border-teal-200">
                                  Comm: {group.commNo}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary">
                                Monthly: {formatCurrency(group.monthlyAmount)}
                              </Badge>
                              <Badge variant="secondary">
                                Duration: {group.durationMonths} months
                              </Badge>
                              <Badge variant="secondary">
                                Members: {members.length}
                              </Badge>
                              <Badge className="rounded-full bg-green-100 text-green-800 hover:bg-green-100">
                                Collected: {formatCurrency(groupCollected)}
                              </Badge>
                              <Badge className="rounded-full bg-orange-100 text-orange-800 hover:bg-orange-100">
                                Pending: {formatCurrency(groupPending)}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {canDo("groups","edit") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditGroupDialog(group);
                                setEditGroupForm({
                                  groupNumber: group.groupNumber || "",
                                  name: group.name || "",
                                  monthlyAmount: String(group.monthlyAmount || ""),
                                  durationMonths: String(group.durationMonths || "12"),
                                  startMonth: group.startMonth || "January",
                                  startYear: String(group.startYear || currentYear),
                                  adminFeeAmount: String(group.adminFeeAmount || ""),
                                });
                              }}
                            >
                              <Pencil className="h-4 w-4 text-blue-500" />
                            </Button>
                            )}
                            {canDo("groups","delete") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteGroupConfirm(group)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            )}
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="mb-2 text-sm font-medium text-slate-700">Assigned Clients</p>
                          {members.length === 0 ? (
                            <p className="text-sm text-slate-400 py-3">No clients assigned yet.</p>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-slate-50">
                                    <TableHead className="w-16 text-xs">Ticket No.</TableHead>
                                    <TableHead className="text-xs">Client Name</TableHead>
                                    <TableHead className="text-xs">Phone</TableHead>
                                    <TableHead className="text-xs">Documents</TableHead>
                                    {canDo("groups","manageMembers") && <TableHead className="w-10 text-xs"></TableHead>}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {members.map((member, mIdx) => {
                                    const clientDocs = (group.clientDocs || []).filter((d) => d.clientId === member._id);
                                    const isGrpDragOver = grpDragOver.groupId === group._id && grpDragOver.idx === mIdx;
                                    return (
                                      <TableRow
                                        key={member._id}
                                        draggable
                                        onDragStart={() => { grpDragRef.current = { groupId: group._id, fromIdx: mIdx }; }}
                                        onDragOver={(e) => { e.preventDefault(); setGrpDragOver({ groupId: group._id, idx: mIdx }); }}
                                        onDragLeave={() => setGrpDragOver({ groupId: null, idx: null })}
                                        onDrop={() => handleGroupClientDrop(group, mIdx)}
                                        onDragEnd={() => { setGrpDragOver({ groupId: null, idx: null }); grpDragRef.current = { groupId: null, fromIdx: null }; }}
                                        className={isGrpDragOver ? "bg-blue-50 border-t-2 border-blue-400" : ""}
                                      >
                                        <TableCell className="w-12 text-center select-none cursor-grab active:cursor-grabbing">
                                          <div className="flex items-center justify-center gap-0.5 text-slate-400">
                                            <GripVertical className="h-3 w-3" />
                                            <span className="font-mono text-sm font-semibold text-slate-600">{mIdx + 1}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell className="font-medium text-sm">{member.name}</TableCell>
                                        <TableCell className="text-sm text-slate-500">{(member.phones?.[0] || member.phone || "—")}</TableCell>
                                        <TableCell>
                                          <div className="flex flex-col gap-1">
                                            {clientDocs.map((doc) => (
                                              <div key={doc._id} className="flex items-center gap-1.5">
                                                <a
                                                  href={`http://localhost:5000/uploads/${doc.filename}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="max-w-[140px] truncate text-xs text-blue-500 hover:underline"
                                                  title={doc.name}
                                                >
                                                  {doc.name}
                                                </a>
                                                {isSuperAdmin && (
                                                  <button
                                                    title="Delete document"
                                                    onClick={async () => {
                                                      if (!window.confirm(`Delete "${doc.name}"?`)) return;
                                                      const updated = await deleteGroupClientDoc(group._id, doc._id);
                                                      setData((prev) => ({ ...prev, groups: prev.groups.map((g) => g._id === group._id ? updated : g) }));
                                                    }}
                                                  >
                                                    <X className="h-3 w-3 text-red-400 hover:text-red-600" />
                                                  </button>
                                                )}
                                              </div>
                                            ))}
                                            {isSuperAdmin && (
                                              <label className="flex cursor-pointer items-center gap-1 text-xs text-blue-500 hover:underline w-fit">
                                                <Plus className="h-3 w-3" />
                                                Upload
                                                <input
                                                  type="file"
                                                  multiple
                                                  className="hidden"
                                                  onChange={async (e) => {
                                                    const files = e.target.files;
                                                    if (!files || files.length === 0) return;
                                                    const fd = new FormData();
                                                    Array.from(files).forEach((f) => fd.append("documents", f));
                                                    const updated = await uploadGroupClientDocs(group._id, member._id, fd);
                                                    setData((prev) => ({ ...prev, groups: prev.groups.map((g) => g._id === group._id ? updated : g) }));
                                                    e.target.value = "";
                                                  }}
                                                />
                                              </label>
                                            )}
                                          </div>
                                        </TableCell>
                                        {canDo("groups","manageMembers") && (
                                          <TableCell className="text-center">
                                            <button
                                              title="Remove from group"
                                              onClick={() => setRemoveClientConfirm({ groupId: group._id, groupName: group.name, clientId: member._id, clientName: member.name })}
                                            >
                                              <X className="h-4 w-4 text-slate-300 hover:text-red-500 transition-colors" />
                                            </button>
                                          </TableCell>
                                        )}
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>

                        {/* Group Reference Documents */}
                        <div className="mt-4 border-t pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-slate-700">Group Documents</p>
                            {isSuperAdmin && (
                              <label className="flex cursor-pointer items-center gap-1 text-xs text-blue-500 hover:underline">
                                <Plus className="h-3 w-3" />
                                Upload
                                <input
                                  type="file"
                                  multiple
                                  className="hidden"
                                  onChange={async (e) => {
                                    const files = e.target.files;
                                    if (!files || files.length === 0) return;
                                    const fd = new FormData();
                                    Array.from(files).forEach((f) => fd.append("documents", f));
                                    const updated = await uploadGroupDocs(group._id, fd);
                                    setData((prev) => ({ ...prev, groups: prev.groups.map((g) => g._id === group._id ? updated : g) }));
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            )}
                          </div>
                          {(group.groupDocs || []).length === 0 ? (
                            <p className="text-xs text-slate-400">No documents uploaded yet.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {(group.groupDocs || []).map((doc) => (
                                <div key={doc._id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                                  <a
                                    href={`http://localhost:5000/uploads/${doc.filename}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="max-w-[180px] truncate text-xs text-blue-600 hover:underline"
                                    title={doc.name}
                                  >
                                    {doc.name}
                                  </a>
                                  {isSuperAdmin && (
                                    <button
                                      title="Delete document"
                                      onClick={async () => {
                                        if (!window.confirm(`Delete "${doc.name}"?`)) return;
                                        const updated = await deleteGroupDoc(group._id, doc._id);
                                        setData((prev) => ({ ...prev, groups: prev.groups.map((g) => g._id === group._id ? updated : g) }));
                                      }}
                                    >
                                      <X className="h-3 w-3 text-red-400 hover:text-red-600" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredGroups.length === 0 && (
                    <div className="rounded-2xl border border-dashed p-10 text-center text-slate-500">
                      No groups found.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            {/* Payment confirmation dialog */}
            <Dialog open={confirmPayDialog} onOpenChange={setConfirmPayDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{existingPayment ? "Confirm Payment Update" : "Confirm Payment"}</DialogTitle>
                </DialogHeader>
                {(() => {
                  const grp = data.groups.find((g) => g._id === paymentForm.groupId);
                  const cli = data.clients.find((c) => c._id === paymentForm.clientId);
                  const snap = existingPayment;
                  const changed = (field) => snap && String(snap[field] || "") !== String(paymentForm[field] || "");
                  const Row = ({ label, before, after, highlight }) => (
                    <div className={`flex justify-between px-4 py-2.5 ${highlight ? "bg-amber-50" : ""}`}>
                      <span className="text-slate-500 shrink-0">{label}</span>
                      <div className="flex items-center gap-2 text-right">
                        {snap && highlight && <span className="text-xs line-through text-slate-400">{before}</span>}
                        <span className={`font-medium ${highlight ? "text-amber-700 font-semibold" : ""}`}>{after}</span>
                      </div>
                    </div>
                  );
                  return (
                    <div className="space-y-4 pt-1">
                      {snap && (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                          Changed fields are highlighted with the old value crossed out.
                        </p>
                      )}
                      <div className="rounded-xl bg-slate-50 divide-y divide-slate-200 overflow-hidden text-sm">
                        <Row label="Client" after={cli?.name || "—"} />
                        <Row label="Group" after={grp?.name || "—"} />
                        <Row label="Installment" after={`${paymentForm.month} ${paymentForm.year}`} />
                        <Row label="Amount"
                          before={snap ? formatCurrency(Number(snap.amount)) : ""}
                          after={formatCurrency(Number(paymentForm.amount) || 0)}
                          highlight={changed("amount")} />
                        <Row label="Payment Mode"
                          before={snap?.mode}
                          after={paymentForm.mode}
                          highlight={changed("mode")} />
                        {(paymentForm.transactionId || snap?.transactionId) && (
                          <Row
                            label={paymentForm.mode === "Cheque" ? "Cheque No." : "Transaction ID"}
                            before={snap?.transactionId || "—"}
                            after={paymentForm.transactionId || "—"}
                            highlight={changed("transactionId")} />
                        )}
                        <Row label="Date"
                          before={snap?.paymentDate}
                          after={paymentForm.paymentDate}
                          highlight={changed("paymentDate")} />
                        {(paymentForm.remark || snap?.remark) && (
                          <Row label="Remark"
                            before={snap?.remark || "—"}
                            after={paymentForm.remark || "—"}
                            highlight={changed("remark")} />
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setConfirmPayDialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          className={`flex-1 rounded-xl ${paymentAddMode === "balance" ? "bg-green-600 hover:bg-green-700" : snap ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                          onClick={async () => {
                            // In balance mode always create a new record, never update
                            const ep = paymentAddMode === "balance" ? null : existingPayment;
                            setConfirmPayDialog(false);
                            await recordPayment(ep);
                            if (paymentAddMode === "balance") setPaymentAddMode("update");
                          }}
                        >
                          {paymentAddMode === "balance" ? "Confirm Balance Payment" : snap ? "Yes, Update" : "Confirm & Save"}
                        </Button>
                      </div>
                    </div>
                  );
                })()}
              </DialogContent>
            </Dialog>

            <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Record Monthly Payment</CardTitle>
                  <CardDescription>
                    Store month-wise payment details for each client
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Group</Label>
                    <Select
                      value={paymentForm.groupId}
                      onValueChange={(value) => {
                        const group = data.groups.find(g => g._id === value);
                        let firstMonth = "January", firstYear = String(currentYear);
                        if (group) {
                          firstMonth = group.startMonth || "January";
                          firstYear = String(group.startYear || currentYear);
                        }
                        setPaymentForm({
                          ...paymentForm,
                          groupId: value,
                          clientId: "",
                          month: firstMonth,
                          year: firstYear,
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose group" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.groups.map((group) => (
                          <SelectItem key={group._id} value={group._id}>
                            {group.groupNumber ? `#${group.groupNumber} — ` : ""}{group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {paymentForm.groupId && (() => {
                      const g = data.groups.find((x) => x._id === paymentForm.groupId);
                      return (
                        <button
                          type="button"
                          className="mt-1 text-xs text-blue-500 hover:underline"
                          onClick={() => {
                            setReportSearch(g?.name || "");
                            setActiveTab("reports");
                          }}
                        >
                          View Report for {g?.name} ↗
                        </button>
                      );
                    })()}
                  </div>
                  <div>
                    <Label>Client</Label>
                    <Select
                      value={paymentForm.clientId}
                      onValueChange={(value) =>
                        setPaymentForm({ ...paymentForm, clientId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose existing client" />
                      </SelectTrigger>
                      <SelectContent>
                        {groupMembers.map((client) => (
                          <SelectItem key={client._id} value={client._id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Installment Period</Label>
                    <Select
                      value={paymentForm.month && paymentForm.year ? `${paymentForm.month}-${paymentForm.year}` : ""}
                      onValueChange={(value) => {
                        const [m, y] = value.split('-');
                        setPaymentForm({ ...paymentForm, month: m, year: y });
                      }}
                      disabled={!paymentForm.groupId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={paymentForm.groupId ? "Select installment" : "Select a group first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedGroupTimeline.map((t, idx) => (
                          <SelectItem key={`${t.month}-${t.year}`} value={`${t.month}-${t.year}`}>
                            {`Installment ${idx + 1} (${t.label})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          amount: e.target.value,
                        })
                      }
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          paymentDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Mode</Label>
                    <Select
                      value={paymentForm.mode}
                      onValueChange={(value) =>
                        setPaymentForm({ ...paymentForm, mode: value, transactionId: "" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Bank Transfer">
                          Bank Transfer
                        </SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {["UPI", "Bank Transfer", "Cheque"].includes(paymentForm.mode) && (
                    <div>
                      <Label>
                        {paymentForm.mode === "UPI" && "UPI Transaction ID"}
                        {paymentForm.mode === "Bank Transfer" && "Bank Reference / Transaction ID"}
                        {paymentForm.mode === "Cheque" && "Cheque Number"}
                        <span className="ml-1 text-red-500">*</span>
                      </Label>
                      <Input
                        value={paymentForm.transactionId}
                        onChange={(e) =>
                          setPaymentForm({ ...paymentForm, transactionId: e.target.value })
                        }
                        placeholder={
                          paymentForm.mode === "UPI"
                            ? "e.g. 123456789012"
                            : paymentForm.mode === "Bank Transfer"
                            ? "e.g. REF0012345"
                            : "e.g. 004521"
                        }
                      />
                    </div>
                  )}
                  <div>
                    <Label>Remark</Label>
                    <Textarea
                      value={paymentForm.remark}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          remark: e.target.value,
                        })
                      }
                      placeholder="Optional remark"
                    />
                  </div>
                  {/* ── Payment status banners ── */}
                  {(() => {
                    const totalPaid = allSlotPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
                    const isPartial = allSlotPayments.length > 0 && selectedSlotScheduled && totalPaid < selectedSlotScheduled;
                    const balance = isPartial ? selectedSlotScheduled - totalPaid : 0;

                    if (paymentAddMode === "balance") {
                      return (
                        <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 flex items-start justify-between gap-2">
                          <div>
                            <span className="font-semibold">Adding balance payment</span> — amount pre-filled with pending balance.
                            <br/>Total paid so far: <span className="font-semibold">{formatCurrency(totalPaid)}</span> · Balance: <span className="font-semibold">{formatCurrency(balance)}</span>
                          </div>
                          <button className="shrink-0 text-blue-600 underline font-medium" onClick={() => {
                            setPaymentAddMode("update");
                            setPaymentForm(prev => ({
                              ...prev,
                              amount: existingPayment ? String(existingPayment.amount) : "",
                              remark: existingPayment?.remark || "",
                            }));
                          }}>Cancel</button>
                        </div>
                      );
                    }

                    if (existingPayment && isSuperAdmin) {
                      return (
                        <div className="space-y-2">
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            <span className="font-semibold">
                              {editTargetPaymentId && allSlotPayments.length > 1
                                ? `Editing Payment ${allSlotPayments.findIndex(p => p._id === editTargetPaymentId) + 1} of ${allSlotPayments.length}.`
                                : "Existing payment found."}
                            </span>{" "}
                            Fields pre-filled — modify and save to update.
                            {allSlotPayments.length > 1 && (
                              <span className="ml-1">(total {formatCurrency(totalPaid)})</span>
                            )}
                          </div>
                          {isPartial && (
                            <button
                              className="w-full rounded-xl border border-green-300 bg-green-50 py-2 text-xs font-semibold text-green-800 hover:bg-green-100 transition-colors"
                              onClick={() => {
                                setPaymentAddMode("balance");
                                setPaymentForm(prev => ({ ...prev, amount: String(balance), remark: "" }));
                              }}
                            >
                              + Pay Balance — {formatCurrency(balance)} pending
                            </button>
                          )}
                        </div>
                      );
                    }

                    if (existingPayment && !isSuperAdmin) {
                      return (
                        <div className="space-y-2">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold">Payment already recorded</span> for this installment. Only super admin can edit existing payments.
                          </div>
                          {isPartial && canDo("payments","record") && (
                            <button
                              className="w-full rounded-xl border border-green-300 bg-green-50 py-2 text-xs font-semibold text-green-800 hover:bg-green-100 transition-colors"
                              onClick={() => {
                                setPaymentAddMode("balance");
                                setPaymentForm(prev => ({ ...prev, amount: String(balance), remark: "" }));
                              }}
                            >
                              + Pay Balance — {formatCurrency(balance)} pending
                            </button>
                          )}
                        </div>
                      );
                    }

                    return null;
                  })()}

                  {/* ── Save / Update button ── */}
                  {(paymentAddMode === "balance" || !existingPayment || isSuperAdmin) && (
                  <Button
                    className={`w-full rounded-xl ${paymentAddMode === "balance" ? "bg-green-600 hover:bg-green-700" : existingPayment && isSuperAdmin ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                    disabled={!canDo("payments","record")}
                    onClick={() => {
                      if (!canDo("payments","record")) return;
                      if (!paymentForm.groupId || !paymentForm.clientId || !paymentForm.amount || !paymentForm.month) {
                        alert("Please fill in Group, Client, Installment Period, and Amount.");
                        return;
                      }
                      if (["UPI", "Bank Transfer", "Cheque"].includes(paymentForm.mode) && !paymentForm.transactionId.trim()) {
                        alert(paymentForm.mode === "Cheque" ? "Please enter the Cheque Number." : `Please enter the ${paymentForm.mode} Transaction ID.`);
                        return;
                      }
                      if (existingPayment && paymentAddMode === "update") {
                        setPaymentForm((prev) => ({
                          ...prev,
                          amount: prev.amount || String(existingPayment.amount),
                          mode: prev.mode || existingPayment.mode,
                          transactionId: prev.transactionId || existingPayment.transactionId || "",
                          paymentDate: prev.paymentDate || existingPayment.paymentDate,
                          remark: prev.remark || existingPayment.remark || "",
                        }));
                      }
                      setConfirmPayDialog(true);
                    }}
                  >
                    <IndianRupee className="mr-2 h-4 w-4" />
                    {paymentAddMode === "balance" ? "Save Balance Payment" : existingPayment && isSuperAdmin ? "Update Payment" : "Save Payment"}
                  </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Payment Tracking Matrix</CardTitle>
                  {paymentForm.groupId && (() => {
                    const g = data.groups.find(gr => gr._id === paymentForm.groupId);
                    if (!g) return null;
                    return (
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <span className="text-base font-semibold text-slate-800">{g.name}</span>
                        {g.groupNumber && (
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-mono font-bold text-blue-700 border border-blue-200">
                            #{g.groupNumber}
                          </span>
                        )}
                        {g.psoNo && (
                          <span className="rounded-md bg-purple-50 px-2 py-0.5 text-xs font-mono font-semibold text-purple-700 border border-purple-200">
                            PSO: {g.psoNo}
                          </span>
                        )}
                        {g.commNo && (
                          <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-mono font-semibold text-teal-700 border border-teal-200">
                            Comm: {g.commNo}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </CardHeader>
                <CardContent>
                  {paymentForm.groupId ? (() => {
                    const group = data.groups.find(g => g._id === paymentForm.groupId);
                    
                    const timeline = selectedGroupTimeline;

                    return (
                    <div className="overflow-x-auto rounded-2xl border min-h-[1000px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 text-center text-xs">Ticket No.</TableHead>
                            <TableHead
                              className="min-w-[150px] cursor-pointer select-none hover:text-blue-600 transition-colors"
                              title="Click to expand/collapse all"
                              onClick={() => {
                                const allIds = groupMembers.map((m) => m._id);
                                const allExpanded = allIds.every((id) => expandedClientIds.includes(id));
                                setExpandedClientIds(allExpanded ? [] : allIds);
                              }}
                            >
                              Client ⇅
                            </TableHead>
                            {timeline.map((t, idx) => (
                              <TableHead key={idx} className="px-2 text-center text-xs whitespace-nowrap">
                                {t.label}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupMembers.length > 0 ? (
                            groupMembers.map((member, memberIdx) => {
                              const isExpanded = expandedClientIds.includes(member._id);
                              const isDragOver = dragOverIdx === memberIdx;
                              return (
                              <TableRow
                                key={member._id}
                                draggable
                                onDragStart={() => { draggedIdxRef.current = memberIdx; }}
                                onDragOver={(e) => { e.preventDefault(); setDragOverIdx(memberIdx); }}
                                onDragLeave={() => setDragOverIdx(null)}
                                onDrop={() => handleMemberDrop(memberIdx)}
                                onDragEnd={() => { setDragOverIdx(null); draggedIdxRef.current = null; }}
                                className={isDragOver ? "bg-blue-50 border-t-2 border-blue-400" : ""}
                              >
                                <TableCell className="w-12 text-center select-none cursor-grab active:cursor-grabbing">
                                  <div className="flex items-center justify-center gap-0.5 text-slate-400">
                                    <GripVertical className="h-3 w-3" />
                                    <span className="text-xs font-medium">{memberIdx + 1}</span>
                                  </div>
                                </TableCell>
                                <TableCell
                                  className="whitespace-nowrap font-medium text-sm cursor-pointer select-none hover:text-blue-600 transition-colors"
                                  onClick={() => {
                                    setExpandedClientIds(prev =>
                                      prev.includes(member._id)
                                        ? prev.filter(id => id !== member._id)
                                        : [...prev, member._id]
                                    )
                                  }}
                                  title="Click to toggle payment amounts"
                                >
                                  {member.name}
                                </TableCell>
                                {timeline.map((t, idx) => {
                                  const cellPayments = data.payments
                                    .filter(
                                      (p) =>
                                        p.groupId === paymentForm.groupId &&
                                        p.clientId === member._id &&
                                        p.month === t.month &&
                                        p.year.toString() === t.year.toString()
                                    )
                                    .sort((a, b) => {
                                      const da = new Date(a.paymentDate || 0);
                                      const db = new Date(b.paymentDate || 0);
                                      return da - db || (a._id < b._id ? -1 : 1);
                                    });
                                  const totalCellPaid = cellPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
                                  const installment = data.installments.find(
                                    (i) => i.groupId === paymentForm.groupId && i.installmentNo === t.installmentNo
                                  );
                                  const base = Number(group?.monthlyAmount || 0);
                                  const dividend = installment ? Number(installment.dividend || 0) : 0;
                                  const scheduledAmount = base > 0 ? base - dividend : null;
                                  const hasPaid = cellPayments.length > 0;
                                  const isPartial = hasPaid && scheduledAmount && totalCellPaid < scheduledAmount;
                                  const balance = isPartial ? scheduledAmount - totalCellPaid : 0;
                                  return (
                                    <TableCell key={idx} className="px-1 text-center align-top py-3">
                                      {hasPaid ? (
                                        <div
                                          className="flex flex-col items-center justify-start gap-0.5"
                                          title={!isExpanded ? `Total: ${formatCurrency(totalCellPaid)}${isPartial ? `\nBalance Due: ${formatCurrency(balance)}` : ""}` : undefined}
                                        >
                                          {isPartial ? (
                                            <AlertCircle className="mx-auto h-4 w-4 text-amber-500" />
                                          ) : (
                                            <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" />
                                          )}
                                          {isExpanded && (
                                            <>
                                              <span className="text-[10px] text-slate-500 font-medium leading-tight whitespace-nowrap">
                                                {formatCurrency(totalCellPaid)}
                                              </span>
                                              {isPartial && (
                                                <span className="text-[10px] text-amber-600 font-semibold leading-tight whitespace-nowrap">
                                                  Bal: {formatCurrency(balance)}
                                                </span>
                                              )}
                                              {cellPayments.map((pmt, pi) => (
                                                <div key={pmt._id} className="flex items-center justify-center gap-1.5">
                                                  <button
                                                    className="text-[9px] text-blue-500 hover:text-blue-700 hover:underline whitespace-nowrap leading-tight"
                                                    title={`Receipt ${cellPayments.length > 1 ? pi + 1 : ""} — ${formatCurrency(pmt.amount)}`}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      const ticketNo = ((group?.memberIds || []).indexOf(member._id) + 1) || "—";
                                                      const chitDueNo = idx + 1;
                                                      downloadReceipt({ payment: pmt, client: member, group, ticketNo, chitDueNo });
                                                    }}
                                                  >
                                                    ↓ Receipt{cellPayments.length > 1 ? ` ${pi + 1}` : ""}
                                                  </button>
                                                  {isSuperAdmin && (
                                                    <button
                                                      title={`Edit payment ${pi + 1}`}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditTargetPaymentId(pmt._id);
                                                        setPaymentAddMode("update");
                                                        setPaymentForm((prev) => ({
                                                          ...prev,
                                                          groupId: paymentForm.groupId,
                                                          clientId: member._id,
                                                          month: t.month,
                                                          year: String(t.year),
                                                          amount: String(pmt.amount),
                                                          mode: pmt.mode || "Cash",
                                                          transactionId: pmt.transactionId || "",
                                                          paymentDate: pmt.paymentDate || "",
                                                          remark: pmt.remark || "",
                                                        }));
                                                      }}
                                                      className="text-[9px] text-slate-400 hover:text-amber-600 leading-tight"
                                                    >
                                                      <Pencil className="h-2.5 w-2.5" />
                                                    </button>
                                                  )}
                                                </div>
                                              ))}
                                            </>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="mx-auto h-4 w-4 mt-0.5 rounded-sm border-2 border-slate-200 bg-slate-50" />
                                      )}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            )})
                          ) : (
                            <TableRow>
                              <TableCell colSpan={13} className="text-center text-slate-500">
                                No clients assigned to this group yet.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    );
                  })() : (
                    <div className="flex h-[1000px] flex-col items-center justify-center rounded-2xl border border-dashed text-slate-400">
                      <CalendarDays className="h-12 w-12 mb-4 opacity-50" />
                      <p>Select a group to display tracking matrix.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {/* Search bar */}
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search group by name…"
                value={reportSearch}
                onChange={(e) => setReportSearch(e.target.value)}
                className="max-w-xs rounded-xl"
              />
              {reportSearch && (
                <Button variant="ghost" size="sm" onClick={() => setReportSearch("")}>
                  Clear
                </Button>
              )}
              <span className="text-sm text-slate-500">
                {data.groups.filter((g) =>
                  g.name.toLowerCase().includes(reportSearch.toLowerCase())
                ).length}{" "}
                group(s)
              </span>
            </div>

            {/* Delete document confirmation dialog */}
            <Dialog open={!!deleteDocConfirm} onOpenChange={(o) => !o && setDeleteDocConfirm(null)}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Delete Document?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold">{deleteDocConfirm?.docName}</span>?
                  This cannot be undone.
                </p>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setDeleteDocConfirm(null)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" className="flex-1 rounded-xl" onClick={handleDeleteDoc}>
                    Delete
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Installment edit dialog */}
            <Dialog open={editInstDialog} onOpenChange={setEditInstDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingSlot
                      ? `Installment ${editingSlot.installmentNo} — ${editingSlot.label}`
                      : "Edit Installment"}
                  </DialogTitle>
                </DialogHeader>
                {editingSlot && (() => {
                  const group = data.groups.find((g) => g._id === editingSlot.groupId);
                  const N = group ? (group.memberIds || []).length : 0;
                  const base = group ? Number(group.monthlyAmount) : 0;
                  const adminFee = group ? Number(group.adminFeeAmount || 0) : 0;
                  const isFirstInstallment = editingSlot.installmentNo === 1;
                  const effectiveAdminFee = isFirstInstallment ? adminFee : 0;
                  const divNum = Number(instEditForm.dividend) || 0;
                  const payNum = Number(instEditForm.payableAmount) || 0;
                  const calcPayable = N > 0 && instEditForm.dividend
                    ? N * base - effectiveAdminFee - divNum * N
                    : null;
                  const calcDividend = N > 0 && instEditForm.payableAmount
                    ? (N * base - effectiveAdminFee - payNum) / N
                    : null;
                  const members = (group?.memberIds || [])
                    .map((id) => data.clients.find((c) => c._id === id))
                    .filter(Boolean);
                  return (
                    <div className="space-y-4 pt-2">
                      <div>
                        <Label>Winner (Optional)</Label>
                        <Select
                          value={instEditForm.winnerId}
                          onValueChange={(v) =>
                            setInstEditForm({ ...instEditForm, winnerId: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select winner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— No winner yet —</SelectItem>
                            {members.map((c) => (
                              <SelectItem key={c._id} value={c._id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Dividend (per member, ₹)</Label>
                        <Input
                          type="number"
                          value={instEditForm.dividend}
                          onChange={(e) =>
                            setInstEditForm({ ...instEditForm, dividend: e.target.value })
                          }
                          placeholder="15000"
                        />
                        {calcPayable !== null && (
                          <p className="mt-1 text-xs text-slate-500">
                            → Payable Amount = {formatCurrency(calcPayable)}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label>Payable Amount (₹)</Label>
                        <Input
                          type="number"
                          value={instEditForm.payableAmount}
                          onChange={(e) =>
                            setInstEditForm({ ...instEditForm, payableAmount: e.target.value })
                          }
                          placeholder="650000"
                        />
                        {calcDividend !== null && (
                          <p className="mt-1 text-xs text-slate-500">
                            → Dividend per member = {formatCurrency(calcDividend)}
                          </p>
                        )}
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-sm">
                        <p className="font-medium">
                          Net Monthly ={" "}
                          {formatCurrency(base - divNum)} per member
                        </p>
                        {N > 0 && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {N} members × {formatCurrency(base)} base −{" "}
                            {formatCurrency(divNum)} dividend
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 rounded-xl"
                          onClick={handleSaveInstallment}
                        >
                          Save Installment
                        </Button>
                        {data.installments.some(
                          (i) => i.groupId === editingSlot.groupId && i.installmentNo === editingSlot.installmentNo
                        ) && (
                          <Button
                            variant="destructive"
                            className="rounded-xl"
                            onClick={handleDeleteInstallment}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </DialogContent>
            </Dialog>

            {data.groups.length === 0 && (
              <div className="rounded-2xl border border-dashed p-10 text-center text-slate-500">
                No groups created yet.
              </div>
            )}

            {data.groups
              .filter((g) =>
                g.name.toLowerCase().includes(reportSearch.toLowerCase())
              )
              .map((group) => {
              const timeline = getGroupTimeline(group);
              const groupInstallments = data.installments.filter(
                (i) => i.groupId === group._id
              );
              const N = (group.memberIds || []).length;
              const base = Number(group.monthlyAmount);
              const adminFee = Number(group.adminFeeAmount || 0);
              const members = (group.memberIds || [])
                .map((id) => data.clients.find((c) => c._id === id))
                .filter(Boolean);

              const scheduleRows = timeline.map((slot) => {
                const inst = groupInstallments.find(
                  (i) => i.installmentNo === slot.installmentNo
                );
                const dividend = inst ? Number(inst.dividend) : null;
                const payable = inst ? Number(inst.payableAmount) : null;
                const monthlyNet = inst ? base - dividend : null;
                const winner =
                  inst?.winnerId && inst.winnerId !== "__none__"
                    ? data.clients.find((c) => c._id === inst.winnerId)
                    : null;
                return { ...slot, inst, dividend, payable, monthlyNet, winner };
              });

              const filledRows = scheduleRows.filter((r) => r.inst);
              const totalMonthly = filledRows.reduce((s, r) => s + r.monthlyNet, 0);
              const totalDividend = filledRows.reduce((s, r) => s + r.dividend, 0);
              const totalPayable = filledRows.reduce((s, r) => s + r.payable, 0);
              const avgPayable =
                filledRows.length > 0 ? totalPayable / filledRows.length : 0;
              const avgDividend =
                filledRows.length > 0 ? totalDividend / filledRows.length : 0;
              const avgDividendPct = base > 0 ? (avgDividend / base) * 100 : 0;

              const groupPayments = data.payments.filter(
                (p) => p.groupId === group._id
              );

              return (
                <div key={group._id} className="space-y-4">
                  {/* Chit Schedule Table */}
                  <Card className="rounded-2xl border-0 shadow-sm">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle>{group.name} — Chit Schedule</CardTitle>
                          <CardDescription className="mt-1">
                            Chit Value:{" "}
                            {formatCurrency(base * Number(group.durationMonths || 0))} (
                            {group.durationMonths} Months) • Monthly {formatCurrency(base)}{" "}
                            • {N} Members
                            {adminFee > 0 &&
                              ` • Admin Fee ${formatCurrency(adminFee)} (1st month)`}
                          </CardDescription>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 rounded-xl"
                          onClick={() => {
                            const g = data.groups.find((x) => x._id === group._id);
                            const firstMonth = g?.startMonth || "January";
                            const firstYear = String(g?.startYear || currentYear);
                            setPaymentForm((prev) => ({
                              ...prev,
                              groupId: group._id,
                              clientId: "",
                              month: firstMonth,
                              year: firstYear,
                            }));
                            setActiveTab("payments");
                          }}
                        >
                          View Payments →
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto rounded-2xl border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-14">S.No.</TableHead>
                              <TableHead>Monthly</TableHead>
                              <TableHead>Dividend</TableHead>
                              <TableHead>Payable Amount</TableHead>
                              <TableHead>Winner Name</TableHead>
                              <TableHead>Document</TableHead>
                              <TableHead>Month</TableHead>
                              <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {scheduleRows.map((row) => (
                              <TableRow
                                key={row.installmentNo}
                                className={row.inst ? "" : "text-slate-400"}
                              >
                                <TableCell className="font-medium">
                                  {row.installmentNo}
                                </TableCell>
                                <TableCell>
                                  {row.monthlyNet !== null
                                    ? formatCurrency(row.monthlyNet)
                                    : "—"}
                                </TableCell>
                                <TableCell>
                                  {row.dividend !== null
                                    ? formatCurrency(row.dividend)
                                    : "—"}
                                </TableCell>
                                <TableCell>
                                  {row.payable !== null
                                    ? formatCurrency(row.payable)
                                    : "—"}
                                </TableCell>
                                <TableCell>
                                  {row.winner ? row.winner.name : "—"}
                                </TableCell>
                                <TableCell className="min-w-[160px]">
                                  {row.inst ? (
                                    <div className="space-y-1">
                                      {(row.inst.documents || []).map((doc) => (
                                        <div key={doc._id} className="flex items-center gap-1">
                                          <a
                                            href={`${API}/uploads/${doc.filename}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="max-w-[120px] truncate text-xs text-blue-500 hover:underline"
                                            title={doc.name}
                                          >
                                            {doc.name}
                                          </a>
                                          {isSuperAdmin && (
                                          <button
                                            title="Delete document"
                                            onClick={() => setDeleteDocConfirm({
                                              installmentId: row.inst._id,
                                              docId: doc._id,
                                              docName: doc.name,
                                            })}
                                          >
                                            <X className="h-3 w-3 text-red-400 hover:text-red-600" />
                                          </button>
                                          )}
                                        </div>
                                      ))}
                                      {isSuperAdmin && (
                                      <label className="flex cursor-pointer items-center gap-1 text-xs text-blue-500 hover:underline">
                                        <Plus className="h-3 w-3" />
                                        Upload
                                        <input
                                          type="file"
                                          multiple
                                          className="hidden"
                                          onChange={(e) => {
                                            handleDocUpload(row.inst._id, e.target.files);
                                            e.target.value = "";
                                          }}
                                        />
                                      </label>
                                      )}
                                    </div>
                                  ) : "—"}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {row.label}
                                </TableCell>
                                <TableCell className="text-right">
                                  {canDo("reports","editSchedule") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingSlot({
                                        groupId: group._id,
                                        ...row,
                                      });
                                      setInstEditForm({
                                        winnerId:
                                          row.inst?.winnerId || "__none__",
                                        dividend:
                                          row.inst?.dividend?.toString() || "",
                                        payableAmount:
                                          row.inst?.payableAmount?.toString() ||
                                          "",
                                      });
                                      setEditInstDialog(true);
                                    }}
                                  >
                                    {row.inst ? "Edit" : "Record"}
                                  </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                            {filledRows.length > 0 && (
                              <TableRow className="bg-slate-50 font-semibold">
                                <TableCell>TOTAL</TableCell>
                                <TableCell>{formatCurrency(totalMonthly)}</TableCell>
                                <TableCell>{formatCurrency(totalDividend)}</TableCell>
                                <TableCell>—</TableCell>
                                <TableCell>—</TableCell>
                                <TableCell>—</TableCell>
                                <TableCell>—</TableCell>
                                <TableCell />
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                      {filledRows.length > 0 && (
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <div className="rounded-xl bg-green-50 p-3 text-center">
                            <p className="text-xs text-slate-500">
                              Total Profit (Dividends)
                            </p>
                            <p className="text-lg font-semibold text-green-700">
                              {formatCurrency(totalDividend)}
                            </p>
                          </div>
                          <div className="rounded-xl bg-blue-50 p-3 text-center">
                            <p className="text-xs text-slate-500">
                              Per Month Avg Payable
                            </p>
                            <p className="text-lg font-semibold text-blue-700">
                              {formatCurrency(avgPayable)}
                            </p>
                          </div>
                          <div className="rounded-xl bg-purple-50 p-3 text-center">
                            <p className="text-xs text-slate-500">
                              Per Month Avg Dividend
                            </p>
                            <p className="text-lg font-semibold text-purple-700">
                              {avgDividendPct.toFixed(2)}% ={" "}
                              {formatCurrency(avgDividend)}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Member Payment Status */}
                  <Card className="rounded-2xl border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle>
                        {group.name} — Member Payment Status
                      </CardTitle>
                      <CardDescription>
                        Monthly {formatCurrency(base)} • {group.durationMonths}{" "}
                        months • Start {group.startMonth} {group.startYear}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto rounded-2xl border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Client</TableHead>
                              <TableHead>Paid Months</TableHead>
                              <TableHead>Pending Months</TableHead>
                              <TableHead>Paid Amount</TableHead>
                              <TableHead>Expected Amount</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {members.length > 0 ? (
                              members.map((member) => {
                                const paid = groupPayments.filter(
                                  (p) => p.clientId === member._id
                                );
                                const paidCount = paid.length;
                                const pendingCount = Math.max(
                                  Number(group.durationMonths) - paidCount,
                                  0
                                );
                                const paidAmount = paid.reduce(
                                  (s, p) => s + Number(p.amount || 0),
                                  0
                                );
                                const expectedAmount =
                                  base * Number(group.durationMonths);
                                return (
                                  <TableRow key={member._id}>
                                    <TableCell className="font-medium">
                                      {member.name}
                                    </TableCell>
                                    <TableCell>{paidCount}</TableCell>
                                    <TableCell>{pendingCount}</TableCell>
                                    <TableCell>
                                      {formatCurrency(paidAmount)}
                                    </TableCell>
                                    <TableCell>
                                      {formatCurrency(expectedAmount)}
                                    </TableCell>
                                    <TableCell>
                                      {pendingCount === 0 ? (
                                        <Badge className="rounded-full">
                                          <CheckCircle2 className="mr-1 h-3 w-3" />{" "}
                                          Completed
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="secondary"
                                          className="rounded-full"
                                        >
                                          Pending
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="text-center text-slate-500"
                                >
                                  No members in this group yet.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
