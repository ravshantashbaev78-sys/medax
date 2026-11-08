import React, { useEffect, useState, useMemo } from "react";
import { api, ApiError } from "../api";
import { useAdminI18n } from "./i18n";
import { numberToWordsUz, numberToWordsRu } from "./numberToWords";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
function formatMoney(n: number | string | null | undefined): string {
  if (n === null || n === undefined || isNaN(Number(n))) return "0";
  return Number(n).toLocaleString("uz-UZ");
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("uz-UZ", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
interface OverviewData {
  totalProducts: number;
  totalStockQty: number;
  totalStockCostValue: number;
  totalStockSellValue: number;
  estimatedProfit: number;
  cashBalance: number;
  totalCashIncome: number;
  totalCashExpense: number;
  customerDebt: number;
  supplierDebt: number;
  lowStockCount: number;
  expiringCount: number;
  recentDocs: any[];
}

interface ErpProduct {
  id: number;
  name: string;
  sku: string | null;
  stock: number;
  costPrice: number | null;
  markupPercent: number | null;
  priceFrom: number | null;
  batchNumber: string | null;
  expDate: string | null;
  minStock: number;
  unit: string | null;
  category?: { id: number; name: string };
  brand?: { id: number; name: string };
  supplier?: { id: number; name: string };
}

interface ErpDoc {
  id: number;
  docNumber: string;
  type: "INCOME" | "OUTCOME" | "TRANSFER" | "RETURN_CUSTOMER" | "RETURN_SUPPLIER" | "WRITE_OFF";
  date: string;
  totalAmount: number;
  paidAmount: number;
  clientName: string | null;
  notes: string | null;
  supplier?: { id: number; name: string };
  customer?: { id: number; name: string; phone: string };
  warehouse?: { id: number; name: string };
  items: any[];
}

interface CashEntry {
  id: number;
  entryNumber: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  paymentType: "CASH" | "CARD" | "BANK_TRANSFER";
  date: string;
  description: string | null;
  customer?: { id: number; name: string; phone: string };
  supplier?: { id: number; name: string };
}

interface Supplier {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  inn: string | null;
  balance: number;
  notes: string | null;
  _count?: { documents: number; products: number };
}

export default function Erp() {
  const { lang } = useAdminI18n();
  const [activeTab, setActiveTab] = useState<"overview" | "inventory" | "documents" | "cash" | "suppliers" | "reports">("overview");

  // Overview State
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);

  // Inventory State
  const [products, setProducts] = useState<ErpProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [invSearch, setInvSearch] = useState("");
  const [invFilter, setInvFilter] = useState<"all" | "low" | "expiring" | "out">("all");
  const [editingProduct, setEditingProduct] = useState<ErpProduct | null>(null);

  // Alerts State
  const [alerts, setAlerts] = useState<{ lowStock: any[]; expiring: any[] }>({ lowStock: [], expiring: [] });
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showExpiringModal, setShowExpiringModal] = useState(false);

  // Documents State
  const [docs, setDocs] = useState<ErpDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docTypeFilter, setDocTypeFilter] = useState<string>("ALL");
  const [showCreateDocModal, setShowCreateDocModal] = useState(false);
  const [selectedDocDetails, setSelectedDocDetails] = useState<ErpDoc | null>(null);
  const [docPrintFormat, setDocPrintFormat] = useState<"standard" | "nakladnaya">("nakladnaya");

  // Cash State
  const [cashData, setCashData] = useState<{ entries: CashEntry[]; totalIncome: number; totalExpense: number; balance: number }>({
    entries: [],
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });
  const [loadingCash, setLoadingCash] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashModalType, setCashModalType] = useState<"INCOME" | "EXPENSE">("INCOME");
  const [selectedCashReceipt, setSelectedCashReceipt] = useState<CashEntry | null>(null);

  // Price tag & Barcode print state
  const [priceTagProduct, setPriceTagProduct] = useState<ErpProduct | null>(null);

  // Excel export state
  const [exportingExcel, setExportingExcel] = useState(false);

  // Suppliers & Clients State
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  // Reports State
  const [turnoverRows, setTurnoverRows] = useState<any[]>([]);
  const [loadingTurnover, setLoadingTurnover] = useState(false);
  const [sverkaData, setSverkaData] = useState<any | null>(null);
  const [loadingSverka, setLoadingSverka] = useState(false);
  const [sverkaEntityType, setSverkaEntityType] = useState<"customer" | "supplier">("supplier");
  const [sverkaEntityId, setSverkaEntityId] = useState<number>(0);
  const [customersList, setCustomersList] = useState<{ id: number; name: string; organization?: string; phone?: string; balance?: number }[]>([]);

  /* ------------------------------------------------------------------------ */
  /* Excel Export Service                                                     */
  /* ------------------------------------------------------------------------ */
  const handleExport = async (endpoint: string, defaultFilename: string) => {
    setExportingExcel(true);
    try {
      const token = localStorage.getItem("mt_token");
      const res = await fetch(`/api${endpoint}`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              "X-Authorization": `Bearer ${token}`,
              "X-Admin-Token": token,
              "X-Access-Token": token,
            }
          : {},
      });
      if (!res.ok) {
        throw new Error("Eksport qilishda xatolik yuz berdi");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = defaultFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || "Eksportda xatolik yuz berdi");
    } finally {
      setExportingExcel(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Data Loaders                                                             */
  /* ------------------------------------------------------------------------ */
  const loadOverview = () => {
    setLoadingOverview(true);
    api<OverviewData>("/admin/erp/overview", { admin: true })
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoadingOverview(false));
  };

  const loadAlerts = () => {
    api<{ lowStock: any[]; expiring: any[] }>("/admin/erp/alerts", { admin: true })
      .then(setAlerts)
      .catch(() => {});
  };

  const loadInventory = () => {
    setLoadingProducts(true);
    api<{ items: ErpProduct[] }>(`/admin/erp/inventory?search=${encodeURIComponent(invSearch)}&status=${invFilter}&limit=300`, { admin: true })
      .then((r) => setProducts(r.items || []))
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  };

  const loadDocs = () => {
    setLoadingDocs(true);
    api<{ docs: ErpDoc[] }>(`/admin/erp/documents?type=${docTypeFilter}`, { admin: true })
      .then((r) => setDocs(r.docs || []))
      .catch(() => {})
      .finally(() => setLoadingDocs(false));
  };

  const loadCash = () => {
    setLoadingCash(true);
    api<{ entries: CashEntry[]; totalIncome: number; totalExpense: number; balance: number }>("/admin/erp/cash", { admin: true })
      .then(setCashData)
      .catch(() => {})
      .finally(() => setLoadingCash(false));
  };

  const loadSuppliers = () => {
    setLoadingSuppliers(true);
    api<{ suppliers: Supplier[] }>("/admin/erp/suppliers", { admin: true })
      .then((r) => setSuppliers(r.suppliers || []))
      .catch(() => {})
      .finally(() => setLoadingSuppliers(false));
  };

  const loadCustomers = () => {
    api<{ items: any[] }>("/admin/customers?limit=100", { admin: true })
      .then((r) => setCustomersList(r.items || []))
      .catch(() => {});
  };

  const loadTurnover = () => {
    setLoadingTurnover(true);
    api<{ rows: any[] }>("/admin/erp/reports/turnover", { admin: true })
      .then((r) => setTurnoverRows(r.rows || []))
      .catch(() => {})
      .finally(() => setLoadingTurnover(false));
  };

  const loadSverka = () => {
    if (!sverkaEntityId) return;
    setLoadingSverka(true);
    api<any>(`/admin/erp/reports/act-sverka?type=${sverkaEntityType}&id=${sverkaEntityId}`, { admin: true })
      .then(setSverkaData)
      .catch((err) => alert(err.message || "Xatolik"))
      .finally(() => setLoadingSverka(false));
  };

  // Initial tab triggers
  useEffect(() => {
    loadOverview();
    loadAlerts();
    loadSuppliers();
    loadCustomers();
  }, []);

  useEffect(() => {
    if (activeTab === "overview") loadOverview();
    if (activeTab === "inventory") loadInventory();
    if (activeTab === "documents") loadDocs();
    if (activeTab === "cash") loadCash();
    if (activeTab === "suppliers") loadSuppliers();
    if (activeTab === "reports") loadTurnover();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "inventory") {
      const t = setTimeout(loadInventory, 300);
      return () => clearTimeout(t);
    }
  }, [invSearch, invFilter]);

  useEffect(() => {
    if (activeTab === "documents") loadDocs();
  }, [docTypeFilter]);

  /* ------------------------------------------------------------------------ */
  /* Quick Edit Product                                                       */
  /* ------------------------------------------------------------------------ */
  const handleSaveProductQuick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    api("/admin/erp/inventory/quick-update", {
      admin: true,
      json: {
        id: editingProduct.id,
        costPrice: Number(editingProduct.costPrice) || 0,
        markupPercent: Number(editingProduct.markupPercent) || 0,
        priceFrom: Number(editingProduct.priceFrom) || 0,
        stock: Number(editingProduct.stock) || 0,
        minStock: Number(editingProduct.minStock) || 5,
        batchNumber: editingProduct.batchNumber || null,
        expDate: editingProduct.expDate || null,
      },
    })
      .then(() => {
        setEditingProduct(null);
        loadInventory();
        loadAlerts();
        loadOverview();
      })
      .catch((err: any) => alert(err.message || "Xatolik yuz berdi"));
  };

  /* ------------------------------------------------------------------------ */
  /* New Document Modal State                                                 */
  /* ------------------------------------------------------------------------ */
  const [docForm, setDocForm] = useState<{
    type: "INCOME" | "OUTCOME" | "TRANSFER" | "RETURN_CUSTOMER" | "RETURN_SUPPLIER" | "WRITE_OFF";
    supplierId: number | "";
    customerId: number | "";
    clientName: string;
    paidAmount: number;
    paymentType: "CASH" | "CARD" | "BANK_TRANSFER";
    notes: string;
    items: {
      productId: number;
      productName: string;
      quantity: number;
      costPrice: number;
      markup: number;
      sellPrice: number;
      batchNumber: string;
      expDate: string;
    }[];
  }>({
    type: "INCOME",
    supplierId: "",
    customerId: "",
    clientName: "",
    paidAmount: 0,
    paymentType: "CASH",
    notes: "",
    items: [],
  });

  const handleAddItemToDoc = (prod: ErpProduct) => {
    const cost = Number(prod.costPrice) || (Number(prod.priceFrom) ? Number(prod.priceFrom) * 0.8 : 0);
    const sell = Number(prod.priceFrom) || (cost ? cost * 1.2 : 0);
    const markup = cost ? Math.round(((sell - cost) / cost) * 100) : 20;

    setDocForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: prod.id,
          productName: prod.name,
          quantity: 1,
          costPrice: Math.round(cost),
          markup,
          sellPrice: Math.round(sell),
          batchNumber: prod.batchNumber || "",
          expDate: prod.expDate || "",
        },
      ],
    }));
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (docForm.items.length === 0) {
      alert("Kamida bitta tovar qo'shing!");
      return;
    }

    const payload = {
      type: docForm.type,
      supplierId: docForm.supplierId ? Number(docForm.supplierId) : undefined,
      customerId: docForm.customerId ? Number(docForm.customerId) : undefined,
      clientName: docForm.clientName || undefined,
      paidAmount: Number(docForm.paidAmount) || 0,
      paymentType: docForm.paymentType,
      notes: docForm.notes || undefined,
      items: docForm.items.map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity) || 1,
        costPrice: Number(i.costPrice) || 0,
        markup: Number(i.markup) || 0,
        sellPrice: Number(i.sellPrice) || 0,
        batchNumber: i.batchNumber || undefined,
        expDate: i.expDate || undefined,
      })),
    };

    api("/admin/erp/documents", { admin: true, json: payload })
      .then(() => {
        setShowCreateDocModal(false);
        setDocForm({
          type: "INCOME",
          supplierId: "",
          customerId: "",
          clientName: "",
          paidAmount: 0,
          paymentType: "CASH",
          notes: "",
          items: [],
        });
        loadDocs();
        loadInventory();
        loadOverview();
        loadAlerts();
      })
      .catch((err: any) => alert(err.message || "Xatolik"));
  };

  /* ------------------------------------------------------------------------ */
  /* New Cash Entry State                                                     */
  /* ------------------------------------------------------------------------ */
  const [cashForm, setCashForm] = useState<{
    category: string;
    amount: number;
    paymentType: "CASH" | "CARD" | "BANK_TRANSFER";
    customerId: number | "";
    supplierId: number | "";
    description: string;
  }>({
    category: "MIJOZ_TOLOV",
    amount: 0,
    paymentType: "CASH",
    customerId: "",
    supplierId: "",
    description: "",
  });

  const handleSaveCash = (e: React.FormEvent) => {
    e.preventDefault();
    if (cashForm.amount <= 0) {
      alert("Summa musbat bo'lishi kerak");
      return;
    }

    api("/admin/erp/cash", {
      admin: true,
      json: {
        type: cashModalType,
        category: cashForm.category,
        amount: Number(cashForm.amount),
        paymentType: cashForm.paymentType,
        customerId: cashForm.customerId ? Number(cashForm.customerId) : undefined,
        supplierId: cashForm.supplierId ? Number(cashForm.supplierId) : undefined,
        description: cashForm.description || undefined,
      },
    })
      .then(() => {
        setShowCashModal(false);
        setCashForm({
          category: "MIJOZ_TOLOV",
          amount: 0,
          paymentType: "CASH",
          customerId: "",
          supplierId: "",
          description: "",
        });
        loadCash();
        loadOverview();
      })
      .catch((err: any) => alert(err.message || "Xatolik"));
  };

  /* ------------------------------------------------------------------------ */
  /* New Supplier State                                                       */
  /* ------------------------------------------------------------------------ */
  const [newSupplier, setNewSupplier] = useState({ name: "", company: "", phone: "", inn: "", address: "" });
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name.trim()) return;
    api("/admin/erp/suppliers", { admin: true, json: newSupplier })
      .then(() => {
        setShowSupplierModal(false);
        setNewSupplier({ name: "", company: "", phone: "", inn: "", address: "" });
        loadSuppliers();
      })
      .catch((err: any) => alert(err.message || "Xatolik"));
  };

  return (
    <div className="erp-app-wrap">
      {/* Top Header & Breadcrumb */}
      <div className="erp-top-header">
        <div className="erp-header-left">
          <div className="erp-badge-pill">1C: Enterprise & ERP</div>
          <h1 className="erp-main-title">Ombor, Savdo va Buxgalteriya hisobi</h1>
          <p className="erp-subtitle">Tovarlar kirim-chiqimi, partiyalar, yaroqlilik muddati, kassa va o'zaro hisob-kitoblar</p>
        </div>
        <div className="erp-header-actions">
          <button
            type="button"
            className="btn btn-erp-primary"
            onClick={() => {
              setDocForm((p) => ({ ...p, type: "INCOME" }));
              setShowCreateDocModal(true);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>+ Tovar Kirim qilish (Приход)</span>
          </button>
          <button
            type="button"
            className="btn btn-erp-secondary"
            onClick={() => {
              setDocForm((p) => ({ ...p, type: "OUTCOME" }));
              setShowCreateDocModal(true);
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>- Tovar Chiqim / Sotuv (Расход)</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="erp-nav-tabs">
        <button
          type="button"
          className={`erp-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span>Monitor (Рабочий стол)</span>
        </button>

        <button
          type="button"
          className={`erp-tab-btn ${activeTab === "inventory" ? "active" : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span>Tovarlar & Qoldiqlar (Товары)</span>
          {alerts.lowStock.length > 0 && (
            <span className="erp-tab-badge amber">{alerts.lowStock.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`erp-tab-btn ${activeTab === "documents" ? "active" : ""}`}
          onClick={() => setActiveTab("documents")}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>Hujjatlar (Документы)</span>
        </button>

        <button
          type="button"
          className={`erp-tab-btn ${activeTab === "cash" ? "active" : ""}`}
          onClick={() => setActiveTab("cash")}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="6" width="20" height="12" rx="2" />
            <circle cx="12" cy="12" r="2" />
            <path d="M6 12h.01M18 12h.01" />
          </svg>
          <span>Kassa & Moliya (Касса)</span>
        </button>

        <button
          type="button"
          className={`erp-tab-btn ${activeTab === "suppliers" ? "active" : ""}`}
          onClick={() => setActiveTab("suppliers")}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>Kontragentlar (Поставщики / Клиенты)</span>
        </button>

        <button
          type="button"
          className={`erp-tab-btn ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>Hisobotlar & Sverka (Отчеты)</span>
        </button>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* TAB 1: OVERVIEW / MONITOR (Рабочий стол)                             */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "overview" && (
        <div className="erp-view-content">
          {/* Quick Alert Banners */}
          <div className="erp-alert-row">
            {alerts.lowStock.length > 0 && (
              <div className="erp-alert-card warning" onClick={() => setShowLowStockModal(true)}>
                <div className="erp-alert-icon">⚠️</div>
                <div className="erp-alert-info">
                  <strong>{alerts.lowStock.length} ta tovar tugab qolmoqda</strong>
                  <p>Minimal qoldiq me'yoridan kam qolgan tovarlarni ko'rish va buyurtma berish</p>
                </div>
                <button type="button" className="erp-alert-action-btn">Ro'yxatni ochish →</button>
              </div>
            )}

            {alerts.expiring.length > 0 && (
              <div className="erp-alert-card danger" onClick={() => setShowExpiringModal(true)}>
                <div className="erp-alert-icon">⏳</div>
                <div className="erp-alert-info">
                  <strong>{alerts.expiring.length} ta tovarning yaroqlilik muddati yaqin</strong>
                  <p>Muddati 90 kundan kam qolgan yoki o'tgan reaktiv va tovarlar nazorati</p>
                </div>
                <button type="button" className="erp-alert-action-btn">Muddati o'tganlarni ko'rish →</button>
              </div>
            )}
          </div>

          {/* Metric KPI Cards */}
          <div className="erp-kpi-grid">
            <div className="erp-kpi-card">
              <span className="erp-kpi-label">Ombordagi tovarlar qiymati (Tannarxda)</span>
              <div className="erp-kpi-value">{formatMoney(overview?.totalStockCostValue)} <small>so'm</small></div>
              <div className="erp-kpi-sub">
                Jami miqdor: <strong>{overview?.totalStockQty || 0}</strong> dona ({overview?.totalProducts || 0} xil)
              </div>
            </div>

            <div className="erp-kpi-card success">
              <span className="erp-kpi-label">Sotuv narxidagi qiymat</span>
              <div className="erp-kpi-value">{formatMoney(overview?.totalStockSellValue)} <small>so'm</small></div>
              <div className="erp-kpi-sub">
                Kutilayotgan foyda: <strong>+{formatMoney(overview?.estimatedProfit)} so'm</strong>
              </div>
            </div>

            <div className="erp-kpi-card highlight">
              <span className="erp-kpi-label">Kassadagi joriy qoldiq</span>
              <div className="erp-kpi-value">{formatMoney(overview?.cashBalance)} <small>so'm</small></div>
              <div className="erp-kpi-sub">
                Tushum: +{formatMoney(overview?.totalCashIncome)} | Chiqim: -{formatMoney(overview?.totalCashExpense)}
              </div>
            </div>

            <div className="erp-kpi-card debt">
              <span className="erp-kpi-label">Mijozlar qarzdorligi (Дебиторка)</span>
              <div className="erp-kpi-value">{formatMoney(overview?.customerDebt)} <small>so'm</small></div>
              <div className="erp-kpi-sub">
                Ta'minotchilardan qarzimiz: <strong>{formatMoney(overview?.supplierDebt)} so'm</strong>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts & 1C Navigation Modules */}
          <div className="erp-section-head">
            <h3>Tezkor Amallar va Boshqaruv modullari</h3>
          </div>
          <div className="erp-modules-grid">
            <div
              className="erp-module-box"
              onClick={() => {
                setDocForm((p) => ({ ...p, type: "INCOME" }));
                setShowCreateDocModal(true);
              }}
            >
              <div className="erp-mod-icon incoming">📥</div>
              <div className="erp-mod-text">
                <strong>Приход товар (Kirim)</strong>
                <span>Yetkazib beruvchidan tovar qabul qilish va omborga kiritish</span>
              </div>
            </div>

            <div
              className="erp-module-box"
              onClick={() => {
                setDocForm((p) => ({ ...p, type: "OUTCOME" }));
                setShowCreateDocModal(true);
              }}
            >
              <div className="erp-mod-icon outgoing">📤</div>
              <div className="erp-mod-text">
                <strong>Расход товар (Chiqim / Sotuv)</strong>
                <span>Klinika va dorixonalarga tovar sotish yoki chiqarish</span>
              </div>
            </div>

            <div
              className="erp-module-box"
              onClick={() => {
                setCashModalType("INCOME");
                setShowCashModal(true);
              }}
            >
              <div className="erp-mod-icon cash-in">💵</div>
              <div className="erp-mod-text">
                <strong>Кассовый ордер (Kirim)</strong>
                <span>Mijozlardan qarz yoki sotuv tushumini qabul qilish</span>
              </div>
            </div>

            <div
              className="erp-module-box"
              onClick={() => {
                setCashModalType("EXPENSE");
                setShowCashModal(true);
              }}
            >
              <div className="erp-mod-icon cash-out">💸</div>
              <div className="erp-mod-text">
                <strong>Кассовый ордер (Chiqim)</strong>
                <span>Ta'minotchi to'lovi, ijara yoki transport xarajatlari</span>
              </div>
            </div>

            <div className="erp-module-box" onClick={() => setActiveTab("reports")}>
              <div className="erp-mod-icon report">📑</div>
              <div className="erp-mod-text">
                <strong>Акт сверки (Sverka)</strong>
                <span>Mijoz yoki yetkazib beruvchi bilan solishtirma dalolatnoma</span>
              </div>
            </div>

            <div className="erp-module-box" onClick={() => setActiveTab("inventory")}>
              <div className="erp-mod-icon stock">📊</div>
              <div className="erp-mod-text">
                <strong>Товарный остаток (Qoldiqlar)</strong>
                <span>1C uslubidagi to'liq narx va muddatlar jadvali</span>
              </div>
            </div>
          </div>

          {/* Recent Operations Table */}
          <div className="erp-section-head space-between" style={{ marginTop: 32 }}>
            <h3>Oxirgi bajarilgan operatsiyalar (Hujjatlar)</h3>
            <button type="button" className="btn-link" onClick={() => setActiveTab("documents")}>
              Barchasini ko'rish →
            </button>
          </div>
          <div className="erp-card-table">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Hujjat kodi</th>
                  <th>Turi</th>
                  <th>Sana</th>
                  <th>Kontragent</th>
                  <th>Summa</th>
                  <th>To'langan</th>
                  <th>Holati</th>
                </tr>
              </thead>
              <tbody>
                {overview?.recentDocs && overview.recentDocs.length > 0 ? (
                  overview.recentDocs.map((d) => (
                    <tr key={d.id}>
                      <td><strong>#{d.docNumber}</strong></td>
                      <td>
                        <span className={`erp-doc-pill ${d.type}`}>
                          {d.type === "INCOME" ? "Приход (Kirim)" : d.type === "OUTCOME" ? "Расход (Sotuv)" : d.type}
                        </span>
                      </td>
                      <td>{formatDate(d.date)}</td>
                      <td>{d.supplier?.name || d.customer?.name || d.clientName || "—"}</td>
                      <td><strong>{formatMoney(d.totalAmount)} so'm</strong></td>
                      <td>{formatMoney(d.paidAmount)} so'm</td>
                      <td><span className="erp-status-badge confirmed">Tasdiqlangan</span></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="erp-empty-cell">Hozircha operatsiyalar mavjud emas</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 2: INVENTORY & STOCK (1C uslubidagi tovarlar jadvali)             */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "inventory" && (
        <div className="erp-view-content">
          <div className="erp-inv-toolbar">
            <div className="erp-search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Tovar nomi, kodi, seriya yoki artikul bo'yicha qidirish (Ctrl+F)..."
                value={invSearch}
                onChange={(e) => setInvSearch(e.target.value)}
              />
              {invSearch && <button type="button" onClick={() => setInvSearch("")}>×</button>}
            </div>

            <div className="erp-filter-chips">
              <button
                type="button"
                className={`erp-chip ${invFilter === "all" ? "active" : ""}`}
                onClick={() => setInvFilter("all")}
              >
                Barchasi ({products.length})
              </button>
              <button
                type="button"
                className={`erp-chip warning ${invFilter === "low" ? "active" : ""}`}
                onClick={() => setInvFilter("low")}
              >
                Kam qolganlar (Min qoldiq)
              </button>
              <button
                type="button"
                className={`erp-chip danger ${invFilter === "out" ? "active" : ""}`}
                onClick={() => setInvFilter("out")}
              >
                Omborda tugaganlar (0)
              </button>
            </div>

            <div className="erp-toolbar-actions">
              <button
                type="button"
                className="btn btn-erp-primary"
                onClick={() => {
                  setDocForm((p) => ({ ...p, type: "INCOME" }));
                  setShowCreateDocModal(true);
                }}
              >
                + Kirim (Приход)
              </button>
              <button
                type="button"
                className="btn btn-erp-secondary"
                disabled={exportingExcel}
                onClick={() => handleExport("/admin/erp/export/inventory", `medax-ombor-qoldiqlari-${new Date().toISOString().slice(0, 10)}.xlsx`)}
              >
                📥 {exportingExcel ? "Yuklanmoqda..." : "Excel (.xlsx)"}
              </button>
              <button
                type="button"
                className="btn btn-erp-secondary"
                onClick={() => window.print()}
              >
                🖨️ Chop etish
              </button>
            </div>
          </div>

          {/* 1C Table matching Image 2 */}
          <div className="erp-card-table print-section">
            <table className="erp-table erp-1c-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Kod</th>
                  <th>Tovarlar (Nomi va Modeli)</th>
                  <th style={{ width: 90, textAlign: "center" }}>Qoldiq</th>
                  <th style={{ width: 130, textAlign: "right" }}>Kirim narxi</th>
                  <th style={{ width: 90, textAlign: "center" }}>Nats. %</th>
                  <th style={{ width: 140, textAlign: "right" }}>Sotuv narxi</th>
                  <th style={{ width: 110 }}>Seriya</th>
                  <th style={{ width: 100 }}>Srok (Muddati)</th>
                  <th style={{ width: 140 }}>Yetkazib beruvchi</th>
                  <th style={{ width: 80, textAlign: "center" }}>Amal</th>
                </tr>
              </thead>
              <tbody>
                {loadingProducts ? (
                  <tr>
                    <td colSpan={10} className="erp-empty-cell">Yuklanmoqda...</td>
                  </tr>
                ) : products.length > 0 ? (
                  products.map((p) => {
                    const isLow = p.stock <= (p.minStock || 5);
                    const isOut = p.stock <= 0;
                    return (
                      <tr key={p.id} className={isOut ? "row-out" : isLow ? "row-low" : ""}>
                        <td className="cell-code">#{p.id}</td>
                        <td className="cell-name">
                          <strong>{p.name}</strong>
                          {p.sku && <small className="cell-sku">Art: {p.sku}</small>}
                        </td>
                        <td className="cell-stock" style={{ textAlign: "center" }}>
                          <span className={`erp-stock-badge ${isOut ? "out" : isLow ? "low" : "good"}`}>
                            {p.stock} {p.unit || "dona"}
                          </span>
                        </td>
                        <td className="cell-price" style={{ textAlign: "right" }}>
                          {formatMoney(p.costPrice)} <small>so'm</small>
                        </td>
                        <td className="cell-markup" style={{ textAlign: "center" }}>
                          <span className="erp-markup-badge">
                            {p.markupPercent ? `+${p.markupPercent}%` : "—"}
                          </span>
                        </td>
                        <td className="cell-price sell" style={{ textAlign: "right" }}>
                          <strong>{formatMoney(p.priceFrom)}</strong> <small>so'm</small>
                        </td>
                        <td className="cell-batch">{p.batchNumber || "—"}</td>
                        <td className="cell-exp">
                          <span className="erp-date-badge">{p.expDate || "—"}</span>
                        </td>
                        <td className="cell-supplier">{p.supplier?.name || "—"}</td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="erp-btn-icon"
                            title="Tezkor tahrirlash"
                            onClick={() => setEditingProduct(p)}
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="erp-btn-icon"
                            title="Tsennik & Shtrix-kod chop etish"
                            onClick={() => setPriceTagProduct(p)}
                            style={{ marginLeft: 4 }}
                          >
                            🏷️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="erp-empty-cell">Hech qanday tovar topilmadi</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 3: DOCUMENTS (Hujjatlar - Kirim, Chiqim, Ko'chirish, Qaytarish)  */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "documents" && (
        <div className="erp-view-content">
          <div className="erp-inv-toolbar">
            <div className="erp-filter-chips">
              <button
                type="button"
                className={`erp-chip ${docTypeFilter === "ALL" ? "active" : ""}`}
                onClick={() => setDocTypeFilter("ALL")}
              >
                Barcha hujjatlar
              </button>
              <button
                type="button"
                className={`erp-chip success ${docTypeFilter === "INCOME" ? "active" : ""}`}
                onClick={() => setDocTypeFilter("INCOME")}
              >
                📥 Kirim (Приход)
              </button>
              <button
                type="button"
                className={`erp-chip ${docTypeFilter === "OUTCOME" ? "active" : ""}`}
                onClick={() => setDocTypeFilter("OUTCOME")}
              >
                📤 Chiqim / Sotuv (Расход)
              </button>
              <button
                type="button"
                className={`erp-chip warning ${docTypeFilter === "TRANSFER" ? "active" : ""}`}
                onClick={() => setDocTypeFilter("TRANSFER")}
              >
                🔄 Ko'chirish (Перемещение)
              </button>
              <button
                type="button"
                className={`erp-chip danger ${docTypeFilter === "WRITE_OFF" ? "active" : ""}`}
                onClick={() => setDocTypeFilter("WRITE_OFF")}
              >
                🗑️ Списание
              </button>
            </div>

            <button
              type="button"
              className="btn btn-erp-primary"
              onClick={() => {
                setDocForm((p) => ({ ...p, type: "INCOME" }));
                setShowCreateDocModal(true);
              }}
            >
              + Yangi Hujjat Rasmiylashtirish
            </button>
          </div>

          <div className="erp-card-table">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Hujjat raqami</th>
                  <th>Operatsiya turi</th>
                  <th>Sana</th>
                  <th>Kontragent (Mijoz / Ta'minotchi)</th>
                  <th>Pozitsiyalar</th>
                  <th>Jami summa</th>
                  <th>To'langan</th>
                  <th>Holati</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {loadingDocs ? (
                  <tr>
                    <td colSpan={9} className="erp-empty-cell">Yuklanmoqda...</td>
                  </tr>
                ) : docs.length > 0 ? (
                  docs.map((d) => (
                    <tr key={d.id}>
                      <td><strong>#{d.docNumber}</strong></td>
                      <td>
                        <span className={`erp-doc-pill ${d.type}`}>
                          {d.type === "INCOME"
                            ? "Приход (Kirim)"
                            : d.type === "OUTCOME"
                            ? "Расход (Sotuv)"
                            : d.type === "TRANSFER"
                            ? "Перемещение"
                            : d.type}
                        </span>
                      </td>
                      <td>{formatDate(d.date)}</td>
                      <td>{d.supplier?.name || d.customer?.name || d.clientName || "—"}</td>
                      <td>{d.items?.length || 0} xil tovar</td>
                      <td><strong>{formatMoney(d.totalAmount)} so'm</strong></td>
                      <td>{formatMoney(d.paidAmount)} so'm</td>
                      <td><span className="erp-status-badge confirmed">Tasdiqlangan</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn-link"
                            onClick={() => {
                              setSelectedDocDetails(d);
                              setDocPrintFormat("standard");
                            }}
                          >
                            Detallar
                          </button>
                          <button
                            type="button"
                            className="btn-link"
                            style={{ color: "var(--teal, #0d9488)", fontWeight: 700 }}
                            onClick={() => {
                              setSelectedDocDetails(d);
                              setDocPrintFormat("nakladnaya");
                            }}
                          >
                            🖨️ Nakladnaya
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="erp-empty-cell">Hujjatlar topilmadi</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 4: CASH & FINANCE (Касса и Взаиморасчеты)                        */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "cash" && (
        <div className="erp-view-content">
          <div className="erp-kpi-grid">
            <div className="erp-kpi-card highlight">
              <span className="erp-kpi-label">Joriy kassa qoldig'i</span>
              <div className="erp-kpi-value">{formatMoney(cashData.balance)} <small>so'm</small></div>
            </div>
            <div className="erp-kpi-card success">
              <span className="erp-kpi-label">Jami kirim tushumlar</span>
              <div className="erp-kpi-value">+{formatMoney(cashData.totalIncome)} <small>so'm</small></div>
            </div>
            <div className="erp-kpi-card danger">
              <span className="erp-kpi-label">Jami chiqim xarajatlar</span>
              <div className="erp-kpi-value">-{formatMoney(cashData.totalExpense)} <small>so'm</small></div>
            </div>
          </div>

          <div className="erp-inv-toolbar" style={{ marginTop: 24 }}>
            <div className="erp-toolbar-actions">
              <button
                type="button"
                className="btn btn-erp-primary"
                onClick={() => {
                  setCashModalType("INCOME");
                  setShowCashModal(true);
                }}
              >
                + Kirim Kassa Orderi (ПКО)
              </button>
              <button
                type="button"
                className="btn btn-erp-secondary"
                onClick={() => {
                  setCashModalType("EXPENSE");
                  setShowCashModal(true);
                }}
              >
                - Chiqim Kassa Orderi (РКО)
              </button>
              <button
                type="button"
                className="btn btn-erp-secondary"
                disabled={exportingExcel}
                onClick={() => handleExport("/admin/erp/export/cash", `medax-kassa-kitobi-${new Date().toISOString().slice(0, 10)}.xlsx`)}
              >
                📥 {exportingExcel ? "Yuklanmoqda..." : "Kassa kitobi Excel (.xlsx)"}
              </button>
            </div>
          </div>

          <div className="erp-card-table">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Order raqami</th>
                  <th>Turi</th>
                  <th>Sana</th>
                  <th>Kategoriya</th>
                  <th>To'lov shakli</th>
                  <th>Kontragent</th>
                  <th>Summa</th>
                  <th>Tavsif / Izoh</th>
                  <th>Amal</th>
                </tr>
              </thead>
              <tbody>
                {loadingCash ? (
                  <tr>
                    <td colSpan={9} className="erp-empty-cell">Yuklanmoqda...</td>
                  </tr>
                ) : cashData.entries.length > 0 ? (
                  cashData.entries.map((c) => (
                    <tr key={c.id}>
                      <td><strong>#{c.entryNumber}</strong></td>
                      <td>
                        <span className={`erp-doc-pill ${c.type}`}>
                          {c.type === "INCOME" ? "+ Kirim (ПКО)" : "- Chiqim (РКО)"}
                        </span>
                      </td>
                      <td>{formatDate(c.date)}</td>
                      <td>{c.category}</td>
                      <td>
                        <span className="erp-tag">
                          {c.paymentType === "CASH" ? "Naqd" : c.paymentType === "CARD" ? "Karta" : "Bank o'tkazmasi"}
                        </span>
                      </td>
                      <td>{c.customer?.name || c.supplier?.name || "—"}</td>
                      <td>
                        <strong className={c.type === "INCOME" ? "text-success" : "text-danger"}>
                          {c.type === "INCOME" ? "+" : "-"}{formatMoney(c.amount)} so'm
                        </strong>
                      </td>
                      <td>{c.description || "—"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-link"
                          style={{ color: "var(--teal, #0d9488)", fontWeight: 600 }}
                          title="Kassa orderi kvitansiyasini chop etish"
                          onClick={() => setSelectedCashReceipt(c)}
                        >
                          🖨️ Kvitansiya
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="erp-empty-cell">Kassa operatsiyalari topilmadi</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 5: SUPPLIERS & CLIENTS (Yetkazib beruvchilar va Mijozlar)         */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "suppliers" && (
        <div className="erp-view-content">
          <div className="erp-section-head space-between">
            <div>
              <h3>Yetkazib beruvchilar (Поставщики)</h3>
              <p className="erp-sub">Tibbiy apparatlar va reaktivlar yetkazib beruvchi ta'minotchilar ro'yxati va qarzlar</p>
            </div>
            <button
              type="button"
              className="btn btn-erp-primary"
              onClick={() => setShowSupplierModal(true)}
            >
              + Yangi Yetkazib beruvchi
            </button>
          </div>

          <div className="erp-card-table" style={{ marginBottom: 40 }}>
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Nomi / Firma</th>
                  <th>Kompaniya</th>
                  <th>Telefon</th>
                  <th>STIR (ИНН)</th>
                  <th>Yetkazilgan tovarlar</th>
                  <th>Bizning qarzimiz (Kreditorka)</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {loadingSuppliers ? (
                  <tr>
                    <td colSpan={7} className="erp-empty-cell">Yuklanmoqda...</td>
                  </tr>
                ) : suppliers.length > 0 ? (
                  suppliers.map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.company || "—"}</td>
                      <td>{s.phone || "—"}</td>
                      <td>{s.inn || "—"}</td>
                      <td>{s._count?.documents || 0} ta kirim hujjati</td>
                      <td>
                        <strong className={s.balance > 0 ? "text-danger" : "text-success"}>
                          {formatMoney(s.balance)} so'm
                        </strong>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => {
                            setSverkaEntityType("supplier");
                            setSverkaEntityId(s.id);
                            setActiveTab("reports");
                          }}
                        >
                          Akt Sverka →
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="erp-empty-cell">Yetkazib beruvchilar kiritilmagan</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Customers & Clinics Balances */}
          <div className="erp-section-head">
            <h3>Mijozlar & Klinikalar qarzdorligi (Дебиторка)</h3>
            <p className="erp-sub">Xarid qilgan klinikalar, dorixonalar va ularning qarz-haqlari</p>
          </div>
          <div className="erp-card-table">
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Mijoz / Klinika</th>
                  <th>Tashkilot</th>
                  <th>Telefon</th>
                  <th>Mijozning qarzi (Saldo)</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {customersList.length > 0 ? (
                  customersList.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.organization || "Jismoniy shaxs"}</td>
                      <td>{c.phone || "—"}</td>
                      <td>
                        <strong className={(c.balance || 0) > 0 ? "text-danger" : ""}>
                          {formatMoney(c.balance || 0)} so'm
                        </strong>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => {
                            setSverkaEntityType("customer");
                            setSverkaEntityId(c.id);
                            setActiveTab("reports");
                          }}
                        >
                          Akt Sverka →
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="erp-empty-cell">Mijozlar ro'yxati bo'sh</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* TAB 6: REPORTS & AKT SVERKA (Hisobotlar & Solishtirma dalolatnoma)    */}
      {/* -------------------------------------------------------------------- */}
      {activeTab === "reports" && (
        <div className="erp-view-content">
          {/* Sub-tabs for Reports */}
          <div className="erp-reports-box">
            <div className="erp-report-header">
              <h3>📑 Акт сверки взаиморасчетов (Solishtirma dalolatnoma)</h3>
              <p>Mijoz yoki yetkazib beruvchi bilan barcha tovar yetkazib berish va to'lovlar tarixini solishtirish</p>
            </div>

            <div className="erp-sverka-controls">
              <div className="field-group">
                <label>Kontragent turi:</label>
                <select
                  value={sverkaEntityType}
                  onChange={(e) => {
                    setSverkaEntityType(e.target.value as any);
                    setSverkaEntityId(0);
                    setSverkaData(null);
                  }}
                >
                  <option value="supplier">Yetkazib beruvchi (Поставщик)</option>
                  <option value="customer">Mijoz / Klinika (Клиент)</option>
                </select>
              </div>

              <div className="field-group">
                <label>Kontragentni tanlang:</label>
                <select
                  value={sverkaEntityId}
                  onChange={(e) => setSverkaEntityId(Number(e.target.value))}
                >
                  <option value={0}>— Tanlang —</option>
                  {sverkaEntityType === "supplier"
                    ? suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.company || "Yakka shaxs"})</option>
                      ))
                    : customersList.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.organization || "Mijoz"})</option>
                      ))}
                </select>
              </div>

              <button
                type="button"
                className="btn btn-erp-primary"
                onClick={loadSverka}
                disabled={!sverkaEntityId || loadingSverka}
              >
                {loadingSverka ? "Shakllantirilmoqda…" : "Shakllantirish (Сформировать)"}
              </button>

              {sverkaData && (
                <>
                  <button
                    type="button"
                    className="btn btn-erp-secondary"
                    disabled={exportingExcel}
                    onClick={() => handleExport(`/admin/erp/export/act-sverka?type=${sverkaEntityType}&id=${sverkaEntityId}`, `medax-akt-sverka-${new Date().toISOString().slice(0, 10)}.xlsx`)}
                  >
                    📥 Sverka Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    className="btn btn-erp-secondary"
                    onClick={() => window.print()}
                  >
                    🖨️ A4 Shaklda Chop etish
                  </button>
                </>
              )}
            </div>

            {/* Generated Akt Sverka Preview matching 1C layout */}
            {sverkaData && (
              <div className="erp-act-sverka-sheet print-section">
                <div className="sverka-sheet-head">
                  <h2>AKT SVERKA (O'zaro hisob-kitob solishtirma dalolatnomasi)</h2>
                  <p>«MEDAX TIBBIY USKUNALAR» va «<strong>{sverkaData.entity.name}</strong>» o'rtasida</p>
                  <small>Davr: {formatDate(sverkaData.dateFrom)} — {formatDate(sverkaData.dateTo)}</small>
                </div>

                <div className="sverka-balance-box">
                  <div>Hozirgi yakuniy saldo (balans): <strong>{formatMoney(sverkaData.entity.balance)} so'm</strong></div>
                </div>

                <table className="erp-table sverka-table">
                  <thead>
                    <tr>
                      <th style={{ width: 110 }}>Sana</th>
                      <th style={{ width: 140 }}>Hujjat #</th>
                      <th>Operatsiya mazmuni</th>
                      <th style={{ width: 140, textAlign: "right" }}>Debet (Chiqim)</th>
                      <th style={{ width: 140, textAlign: "right" }}>Kredit (Kirim)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sverkaData.timeline && sverkaData.timeline.length > 0 ? (
                      sverkaData.timeline.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td>{formatDate(item.date)}</td>
                          <td><strong>{item.docNumber}</strong></td>
                          <td>{item.description}</td>
                          <td style={{ textAlign: "right" }}>{item.debit ? formatMoney(item.debit) + " so'm" : "—"}</td>
                          <td style={{ textAlign: "right" }}>{item.credit ? formatMoney(item.credit) + " so'm" : "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="erp-empty-cell">Bu davrda operatsiyalar topilmadi</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="sverka-signatures">
                  <div className="sverka-sig-col">
                    <p><strong>«MEDAX» vakili:</strong></p>
                    <div className="sig-line">____________________ (M.O'.)</div>
                  </div>
                  <div className="sverka-sig-col">
                    <p><strong>«{sverkaData.entity.name}» vakili:</strong></p>
                    <div className="sig-line">____________________ (M.O'.)</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Turnover Report Section (Товарная оборотка) */}
          <div className="erp-reports-box" style={{ marginTop: 32 }}>
            <div className="erp-report-header space-between">
              <div>
                <h3>📊 Товарная оборотка (Tovar oborotkasi)</h3>
                <p>Tanlangan davr bo'yicha tovarlar harakati: Boshlang'ich qoldiq, Kirim, Chiqim va Yakuniy qoldiq</p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-erp-secondary"
                  disabled={exportingExcel}
                  onClick={() => handleExport("/admin/erp/export/turnover", `medax-tovar-oborotkasi-${new Date().toISOString().slice(0, 10)}.xlsx`)}
                >
                  📥 {exportingExcel ? "Yuklanmoqda..." : "Oborotka Excel (.xlsx)"}
                </button>
                <button type="button" className="btn btn-erp-secondary" onClick={loadTurnover}>
                  Yangilash
                </button>
              </div>
            </div>

            <div className="erp-card-table print-section">
              <table className="erp-table erp-1c-table">
                <thead>
                  <tr>
                    <th>Tovar nomi</th>
                    <th>Artikul</th>
                    <th style={{ textAlign: "center" }}>Boshlang'ich qoldiq</th>
                    <th style={{ textAlign: "right" }}>Kirim (soni)</th>
                    <th style={{ textAlign: "right" }}>Kirim (summa)</th>
                    <th style={{ textAlign: "right" }}>Chiqim (soni)</th>
                    <th style={{ textAlign: "right" }}>Chiqim (summa)</th>
                    <th style={{ textAlign: "center" }}>Oxirgi qoldiq</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingTurnover ? (
                    <tr>
                      <td colSpan={8} className="erp-empty-cell">Yuklanmoqda...</td>
                    </tr>
                  ) : turnoverRows.length > 0 ? (
                    turnoverRows.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.name}</strong></td>
                        <td>{r.sku}</td>
                        <td style={{ textAlign: "center" }}>{r.openingStock} {r.unit}</td>
                        <td style={{ textAlign: "right", color: "#10b981" }}>+{r.incomeQty}</td>
                        <td style={{ textAlign: "right" }}>{formatMoney(r.incomeSum)} so'm</td>
                        <td style={{ textAlign: "right", color: "#ef4444" }}>-{r.outcomeQty}</td>
                        <td style={{ textAlign: "right" }}>{formatMoney(r.outcomeSum)} so'm</td>
                        <td style={{ textAlign: "center" }}>
                          <strong>{r.closingStock} {r.unit}</strong>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="erp-empty-cell">Ma'lumot topilmadi</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Price List Section */}
          <div className="erp-reports-box" style={{ marginTop: 32 }}>
            <div className="erp-report-header space-between">
              <div>
                <h3>🏷️ Mijozlar va Klinikalar uchun Rasmiy Prays-list</h3>
                <p>Barcha faol tibbiy asboblar va reaktivlarning rasmiy narxlari, artikul va mavjudlik holatini Excel formatida shakllantirish</p>
              </div>
              <button
                type="button"
                className="btn btn-erp-primary"
                disabled={exportingExcel}
                onClick={() => handleExport("/admin/erp/export/price-list", `medax-prays-list-${new Date().toISOString().slice(0, 10)}.xlsx`)}
              >
                📥 {exportingExcel ? "Yuklanmoqda..." : "Prays-list Excel (.xlsx) yuklab olish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 1: CREATE DOCUMENT (Приход / Расход / Перемещение)             */}
      {/* -------------------------------------------------------------------- */}
      {showCreateDocModal && (
        <div className="erp-modal-overlay" onClick={() => setShowCreateDocModal(false)}>
          <div className="erp-modal-window large" onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-header">
              <h3>
                {docForm.type === "INCOME"
                  ? "📥 Yangi Tovar Kirimi (Приход)"
                  : docForm.type === "OUTCOME"
                  ? "📤 Yangi Tovar Chiqimi / Sotuv (Расход)"
                  : "📑 Yangi Hujjat"}
              </h3>
              <button type="button" className="erp-close-btn" onClick={() => setShowCreateDocModal(false)}>×</button>
            </div>

            <form onSubmit={handleSaveDocument}>
              <div className="erp-modal-body">
                <div className="erp-form-grid-3">
                  <div className="field">
                    <label>Hujjat turi:</label>
                    <select
                      value={docForm.type}
                      onChange={(e) => setDocForm({ ...docForm, type: e.target.value as any })}
                    >
                      <option value="INCOME">Kirim (Приход товара)</option>
                      <option value="OUTCOME">Chiqim / Sotuv (Расход товара)</option>
                      <option value="TRANSFER">Omborlararo ko'chirish</option>
                      <option value="RETURN_CUSTOMER">Mijozdan qaytish (Возврат)</option>
                      <option value="RETURN_SUPPLIER">Ta'minotchiga qaytarish</option>
                      <option value="WRITE_OFF">Списание (Hisobdan chiqarish)</option>
                    </select>
                  </div>

                  {docForm.type === "INCOME" || docForm.type === "RETURN_SUPPLIER" ? (
                    <div className="field">
                      <label>Yetkazib beruvchi (Поставщик):</label>
                      <select
                        value={docForm.supplierId}
                        onChange={(e) => setDocForm({ ...docForm, supplierId: Number(e.target.value) || "" })}
                      >
                        <option value="">— Yetkazib beruvchini tanlang —</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} {s.company ? `(${s.company})` : ""}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="field">
                      <label>Mijoz / Klinika:</label>
                      <select
                        value={docForm.customerId}
                        onChange={(e) => setDocForm({ ...docForm, customerId: Number(e.target.value) || "" })}
                      >
                        <option value="">— Mijozni tanlang —</option>
                        {customersList.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} {c.organization ? `(${c.organization})` : ""}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="field">
                    <label>To'lov usuli:</label>
                    <select
                      value={docForm.paymentType}
                      onChange={(e) => setDocForm({ ...docForm, paymentType: e.target.value as any })}
                    >
                      <option value="CASH">Naqd pul (Do'konda/Kassada)</option>
                      <option value="CARD">Karta / Terminal</option>
                      <option value="BANK_TRANSFER">Hisob-raqam (B2B Shartnoma)</option>
                    </select>
                  </div>
                </div>

                {/* Items selection box */}
                <div className="erp-doc-items-box">
                  <div className="erp-doc-items-head">
                    <strong>Hujjat tarkibidagi tovarlar ({docForm.items.length})</strong>
                    <div className="erp-add-prod-select">
                      <select
                        onChange={(e) => {
                          const pid = Number(e.target.value);
                          if (!pid) return;
                          const found = products.find((p) => p.id === pid);
                          if (found) handleAddItemToDoc(found);
                          e.target.value = "";
                        }}
                      >
                        <option value="">+ Katalogdan tovar qo'shish...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} (Qoldiq: {p.stock})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <table className="erp-table doc-create-table">
                    <thead>
                      <tr>
                        <th>Tovar nomi</th>
                        <th style={{ width: 80 }}>Miqdor</th>
                        <th style={{ width: 120 }}>Kirim narxi</th>
                        <th style={{ width: 80 }}>Nats. %</th>
                        <th style={{ width: 120 }}>Sotuv narxi</th>
                        <th style={{ width: 100 }}>Seriya</th>
                        <th style={{ width: 110 }}>Muddat</th>
                        <th style={{ width: 120 }}>Jami</th>
                        <th style={{ width: 50 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {docForm.items.length > 0 ? (
                        docForm.items.map((it, idx) => {
                          const lineTotal = (docForm.type === "INCOME" ? it.costPrice : it.sellPrice) * it.quantity;
                          return (
                            <tr key={idx}>
                              <td><strong>{it.productName}</strong></td>
                              <td>
                                <input
                                  type="number"
                                  min={1}
                                  value={it.quantity}
                                  onChange={(e) => {
                                    const q = Number(e.target.value) || 1;
                                    const copy = [...docForm.items];
                                    copy[idx].quantity = q;
                                    setDocForm({ ...docForm, items: copy });
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min={0}
                                  value={it.costPrice}
                                  onChange={(e) => {
                                    const cost = Number(e.target.value) || 0;
                                    const copy = [...docForm.items];
                                    copy[idx].costPrice = cost;
                                    if (copy[idx].markup) {
                                      copy[idx].sellPrice = Math.round(cost * (1 + copy[idx].markup / 100));
                                    }
                                    setDocForm({ ...docForm, items: copy });
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  value={it.markup}
                                  onChange={(e) => {
                                    const m = Number(e.target.value) || 0;
                                    const copy = [...docForm.items];
                                    copy[idx].markup = m;
                                    copy[idx].sellPrice = Math.round(copy[idx].costPrice * (1 + m / 100));
                                    setDocForm({ ...docForm, items: copy });
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min={0}
                                  value={it.sellPrice}
                                  onChange={(e) => {
                                    const sell = Number(e.target.value) || 0;
                                    const copy = [...docForm.items];
                                    copy[idx].sellPrice = sell;
                                    if (copy[idx].costPrice) {
                                      copy[idx].markup = Math.round(((sell - copy[idx].costPrice) / copy[idx].costPrice) * 100);
                                    }
                                    setDocForm({ ...docForm, items: copy });
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  placeholder="Seriya #"
                                  value={it.batchNumber}
                                  onChange={(e) => {
                                    const copy = [...docForm.items];
                                    copy[idx].batchNumber = e.target.value;
                                    setDocForm({ ...docForm, items: copy });
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  placeholder="YYYY-MM"
                                  value={it.expDate}
                                  onChange={(e) => {
                                    const copy = [...docForm.items];
                                    copy[idx].expDate = e.target.value;
                                    setDocForm({ ...docForm, items: copy });
                                  }}
                                />
                              </td>
                              <td><strong>{formatMoney(lineTotal)} so'm</strong></td>
                              <td>
                                <button
                                  type="button"
                                  className="erp-delete-btn"
                                  onClick={() => {
                                    setDocForm({ ...docForm, items: docForm.items.filter((_, i) => i !== idx) });
                                  }}
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={9} className="erp-empty-cell">
                            Hujjatga hali tovar qo'shilmadi. Yuqoridagi ro'yxatdan tovar tanlang.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Bottom summary and payment */}
                <div className="erp-doc-footer-grid">
                  <div className="field">
                    <label>Izoh yoki shartnoma raqami:</label>
                    <input
                      type="text"
                      placeholder="Qo'shimcha izoh..."
                      value={docForm.notes}
                      onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                    />
                  </div>

                  <div className="field">
                    <label>Hozir to'langan summa (so'm):</label>
                    <input
                      type="number"
                      min={0}
                      value={docForm.paidAmount}
                      onChange={(e) => setDocForm({ ...docForm, paidAmount: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              <div className="erp-modal-footer">
                <button type="button" className="btn btn-erp-secondary" onClick={() => setShowCreateDocModal(false)}>
                  Bekor qilish
                </button>
                <button type="submit" className="btn btn-erp-primary" disabled={docForm.items.length === 0}>
                  ✓ Hujjatni saqlash va tasdiqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 2: QUICK EDIT PRODUCT (1C uslubida tovar narxi va qoldig'i)     */}
      {/* -------------------------------------------------------------------- */}
      {editingProduct && (
        <div className="erp-modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="erp-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-header">
              <h3>Tovar narxlari va qoldiqlarini tahrirlash</h3>
              <button type="button" className="erp-close-btn" onClick={() => setEditingProduct(null)}>×</button>
            </div>
            <form onSubmit={handleSaveProductQuick}>
              <div className="erp-modal-body">
                <p><strong>{editingProduct.name}</strong></p>
                <div className="erp-form-grid-2">
                  <div className="field">
                    <label>Kirim narxi (Tannarx):</label>
                    <input
                      type="number"
                      value={editingProduct.costPrice || 0}
                      onChange={(e) => {
                        const cost = Number(e.target.value) || 0;
                        const markup = editingProduct.markupPercent || 0;
                        const sell = markup ? Math.round(cost * (1 + markup / 100)) : editingProduct.priceFrom;
                        setEditingProduct({ ...editingProduct, costPrice: cost, priceFrom: sell });
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>Natsenka (%):</label>
                    <input
                      type="number"
                      value={editingProduct.markupPercent || 0}
                      onChange={(e) => {
                        const m = Number(e.target.value) || 0;
                        const cost = Number(editingProduct.costPrice) || 0;
                        const sell = cost ? Math.round(cost * (1 + m / 100)) : editingProduct.priceFrom;
                        setEditingProduct({ ...editingProduct, markupPercent: m, priceFrom: sell });
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>Sotuv narxi (Saytda va ilovada):</label>
                    <input
                      type="number"
                      value={editingProduct.priceFrom || 0}
                      onChange={(e) => {
                        const sell = Number(e.target.value) || 0;
                        const cost = Number(editingProduct.costPrice) || 0;
                        const markup = cost ? Math.round(((sell - cost) / cost) * 100) : 0;
                        setEditingProduct({ ...editingProduct, priceFrom: sell, markupPercent: markup });
                      }}
                    />
                  </div>
                  <div className="field">
                    <label>Hozirgi qoldiq (Omborda):</label>
                    <input
                      type="number"
                      value={editingProduct.stock}
                      onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="field">
                    <label>Minimal me'yoriy qoldiq:</label>
                    <input
                      type="number"
                      value={editingProduct.minStock}
                      onChange={(e) => setEditingProduct({ ...editingProduct, minStock: Number(e.target.value) || 5 })}
                    />
                  </div>
                  <div className="field">
                    <label>Seriya / Partiya #:</label>
                    <input
                      type="text"
                      value={editingProduct.batchNumber || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, batchNumber: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Yaroqlilik muddati (Срок):</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-12 yoki 12.2026"
                      value={editingProduct.expDate || ""}
                      onChange={(e) => setEditingProduct({ ...editingProduct, expDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="erp-modal-footer">
                <button type="button" className="btn btn-erp-secondary" onClick={() => setEditingProduct(null)}>
                  Bekor qilish
                </button>
                <button type="submit" className="btn btn-erp-primary">
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 3: CASH ENTRY (ПКО / РКО)                                      */}
      {/* -------------------------------------------------------------------- */}
      {showCashModal && (
        <div className="erp-modal-overlay" onClick={() => setShowCashModal(false)}>
          <div className="erp-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-header">
              <h3>{cashModalType === "INCOME" ? "💵 Kirim Kassa Orderi (ПКО)" : "💸 Chiqim Kassa Orderi (РКО)"}</h3>
              <button type="button" className="erp-close-btn" onClick={() => setShowCashModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveCash}>
              <div className="erp-modal-body">
                <div className="field">
                  <label>Kategoriya:</label>
                  <select
                    value={cashForm.category}
                    onChange={(e) => setCashForm({ ...cashForm, category: e.target.value })}
                  >
                    {cashModalType === "INCOME" ? (
                      <>
                        <option value="MIJOZ_TOLOV">Mijozdan to'lov (Qarz yopish / Avans)</option>
                        <option value="DOQON_SOTUV">Do'kondagi naqd sotuv</option>
                        <option value="BOSHQA_KIRIM">Boshqa tushum</option>
                      </>
                    ) : (
                      <>
                        <option value="TAMINOTCHI_TOLOV">Yetkazib beruvchiga to'lov</option>
                        <option value="IJARA">Do'kon va ombor ijarasi</option>
                        <option value="OYLIK">Xodimlar oylik maoshi</option>
                        <option value="TRANSPORT">Yetkazib berish va transport xarajati</option>
                        <option value="KOMMUNAL">Kommunal va internet xarajatlari</option>
                        <option value="BOSHQA_CHIQIM">Boshqa xo'jalik xarajati</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="field">
                  <label>Summa (so'm):</label>
                  <input
                    type="number"
                    min={1}
                    value={cashForm.amount || ""}
                    onChange={(e) => setCashForm({ ...cashForm, amount: Number(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="field">
                  <label>To'lov turi:</label>
                  <select
                    value={cashForm.paymentType}
                    onChange={(e) => setCashForm({ ...cashForm, paymentType: e.target.value as any })}
                  >
                    <option value="CASH">Naqd pul</option>
                    <option value="CARD">Karta / Terminal</option>
                    <option value="BANK_TRANSFER">Hisob-raqam (B2B Bank)</option>
                  </select>
                </div>

                {cashModalType === "INCOME" ? (
                  <div className="field">
                    <label>Mijoz (Qarzini kamaytirish uchun):</label>
                    <select
                      value={cashForm.customerId}
                      onChange={(e) => setCashForm({ ...cashForm, customerId: Number(e.target.value) || "" })}
                    >
                      <option value="">— Ixtiyoriy —</option>
                      {customersList.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} (Qarz: {formatMoney(c.balance)} so'm)</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="field">
                    <label>Yetkazib beruvchi (Bizning qarzimizni yopish):</label>
                    <select
                      value={cashForm.supplierId}
                      onChange={(e) => setCashForm({ ...cashForm, supplierId: Number(e.target.value) || "" })}
                    >
                      <option value="">— Ixtiyoriy —</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} (Qarzimiz: {formatMoney(s.balance)} so'm)</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="field">
                  <label>Izoh / Maqsad:</label>
                  <input
                    type="text"
                    placeholder="Masalan: Shartnoma #12 bo'yicha to'lov"
                    value={cashForm.description}
                    onChange={(e) => setCashForm({ ...cashForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="erp-modal-footer">
                <button type="button" className="btn btn-erp-secondary" onClick={() => setShowCashModal(false)}>
                  Bekor qilish
                </button>
                <button type="submit" className="btn btn-erp-primary">
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 4: NEW SUPPLIER                                                */}
      {/* -------------------------------------------------------------------- */}
      {showSupplierModal && (
        <div className="erp-modal-overlay" onClick={() => setShowSupplierModal(false)}>
          <div className="erp-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-header">
              <h3>Yangi Yetkazib beruvchi qo'shish</h3>
              <button type="button" className="erp-close-btn" onClick={() => setShowSupplierModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveSupplier}>
              <div className="erp-modal-body">
                <div className="field">
                  <label>Yetkazib beruvchi ismi yoki vakili *:</label>
                  <input
                    type="text"
                    placeholder="Masalan: Юсуфхон ака"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label>Kompaniya nomi (Brend/Zavod):</label>
                  <input
                    type="text"
                    placeholder="Masalan: Intermed Innovation, Human GmbH"
                    value={newSupplier.company}
                    onChange={(e) => setNewSupplier({ ...newSupplier, company: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Telefon raqami:</label>
                  <input
                    type="text"
                    placeholder="+998 90 123 45 67"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>STIR (ИНН):</label>
                  <input
                    type="text"
                    placeholder="9 xonali STIR raqami"
                    value={newSupplier.inn}
                    onChange={(e) => setNewSupplier({ ...newSupplier, inn: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label>Yuridik manzil:</label>
                  <input
                    type="text"
                    placeholder="Toshkent sh., Chilonzor..."
                    value={newSupplier.address}
                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="erp-modal-footer">
                <button type="button" className="btn btn-erp-secondary" onClick={() => setShowSupplierModal(false)}>
                  Bekor qilish
                </button>
                <button type="submit" className="btn btn-erp-primary">
                  Qo'shish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 5: DOCUMENT DETAILS VIEW & OFFICIAL NAKLADNAYA (A4 PRINT)      */}
      {/* -------------------------------------------------------------------- */}
      {selectedDocDetails && (
        <div className="erp-modal-overlay" onClick={() => setSelectedDocDetails(null)}>
          <div className="erp-modal-window large" style={{ maxWidth: docPrintFormat === "nakladnaya" ? 920 : 760 }} onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0 }}>Hujjat #{selectedDocDetails.docNumber}</h3>
                <div className="erp-view-toggle" style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button
                    type="button"
                    className={`erp-chip ${docPrintFormat === "standard" ? "active" : ""}`}
                    onClick={() => setDocPrintFormat("standard")}
                  >
                    📋 Oddiy ko'rinish
                  </button>
                  <button
                    type="button"
                    className={`erp-chip success ${docPrintFormat === "nakladnaya" ? "active" : ""}`}
                    onClick={() => setDocPrintFormat("nakladnaya")}
                  >
                    📄 Rasmiy Nakladnaya (A4)
                  </button>
                </div>
              </div>
              <button type="button" className="erp-close-btn" onClick={() => setSelectedDocDetails(null)}>×</button>
            </div>
            <div className="erp-modal-body">
              {docPrintFormat === "standard" ? (
                <>
                  <div className="erp-doc-detail-grid">
                    <div>Operatsiya: <strong>{selectedDocDetails.type}</strong></div>
                    <div>Sana: <strong>{formatDate(selectedDocDetails.date)}</strong></div>
                    <div>Kontragent: <strong>{selectedDocDetails.supplier?.name || selectedDocDetails.customer?.name || selectedDocDetails.clientName || "—"}</strong></div>
                    <div>Jami summa: <strong>{formatMoney(selectedDocDetails.totalAmount)} so'm</strong></div>
                  </div>

                  <h4 style={{ marginTop: 20, marginBottom: 10 }}>Hujjatdagi tovarlar:</h4>
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Tovar</th>
                        <th>Miqdor</th>
                        <th>Narx</th>
                        <th>Seriya</th>
                        <th>Yaroqlilik</th>
                        <th>Jami</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDocDetails.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td><strong>{it.productName || it.product?.name}</strong></td>
                          <td>{it.quantity} dona</td>
                          <td>{formatMoney(it.sellPrice || it.costPrice)} so'm</td>
                          <td>{it.batchNumber || "—"}</td>
                          <td>{it.expDate || "—"}</td>
                          <td><strong>{formatMoney(it.totalPrice)} so'm</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                /* OFFICIAL UZBEKISTAN NAKLADNAYA (A4 PRINTABLE) */
                <div className="erp-invoice-sheet print-section">
                  <div className="invoice-company-header">
                    <div>
                      <h4 className="invoice-brand-title">«MEDAX» MCHJ</h4>
                      <p className="invoice-company-sub">
                        Tibbiy asbob-uskunalar, laboratoriya reaktivlari va sarflov materiallari ulgurji hamda chakana savdosi<br />
                        O'zbekiston Respublikasi, Namangan sh., Beruniy ko'chasi 2-uy<br />
                        Tel: +998 (71) 200-00-00, +998 (90) 123-45-67 | Sayt: medax.uz
                      </p>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11, color: "#475569" }}>
                      <div><strong>H/r:</strong> 2020 8000 7005 1234 5001</div>
                      <div><strong>Bank:</strong> ATIB "Ipoteka-bank"</div>
                      <div><strong>MFO:</strong> 00440 | <strong>INN:</strong> 309876543</div>
                    </div>
                  </div>

                  <div className="invoice-doc-title-block">
                    <h3 className="invoice-doc-main-title">
                      {selectedDocDetails.type === "INCOME"
                        ? `TOVAR KIRIMI (ПРИХОДНАЯ НАКЛАДНАЯ) № ${selectedDocDetails.docNumber}`
                        : selectedDocDetails.type === "OUTCOME"
                        ? `TOVAR CHIQIMI VA YUK XATI (РАСХОДНАЯ НАКЛАДНАЯ) № ${selectedDocDetails.docNumber}`
                        : selectedDocDetails.type === "TRANSFER"
                        ? `OMBORLARARO KO'CHIRISH DALOLATNOMASI № ${selectedDocDetails.docNumber}`
                        : selectedDocDetails.type === "RETURN_CUSTOMER"
                        ? `MIJOZDAN QAYTARISH DALOLATNOMASI № ${selectedDocDetails.docNumber}`
                        : selectedDocDetails.type === "RETURN_SUPPLIER"
                        ? `TA'MINOTCHIGA QAYTARISH № ${selectedDocDetails.docNumber}`
                        : `HISOBDAN CHIQARISH (СПИСАНИЕ) № ${selectedDocDetails.docNumber}`}
                    </h3>
                    <div className="invoice-doc-date">
                      Sana: «{new Date(selectedDocDetails.date).getDate()}» {new Date(selectedDocDetails.date).toLocaleDateString("uz-UZ", { month: "long" })} {new Date(selectedDocDetails.date).getFullYear()} y.
                    </div>
                  </div>

                  <div className="invoice-parties-grid">
                    <div className="invoice-party-col">
                      <h5>Yetkazib beruvchi (Jo'natuvchi):</h5>
                      <div className="invoice-party-name">
                        {selectedDocDetails.type === "INCOME"
                          ? (selectedDocDetails.supplier?.name || "Ta'minotchi korxona")
                          : "«MEDAX» MCHJ"}
                      </div>
                      <div className="invoice-party-details">
                        {selectedDocDetails.type === "INCOME"
                          ? `Asosiy yetkazib beruvchi | Ombor: ${selectedDocDetails.warehouse?.name || "Asosiy ombor"}`
                          : "Namangan sh., Beruniy k-si 2-uy. Tel: +998 71 200-00-00, INN: 309876543"}
                      </div>
                    </div>

                    <div className="invoice-party-col">
                      <h5>Qabul qiluvchi (Xaridor):</h5>
                      <div className="invoice-party-name">
                        {selectedDocDetails.type === "INCOME"
                          ? "«MEDAX» MCHJ Ombori"
                          : (selectedDocDetails.customer?.name || selectedDocDetails.clientName || "Xaridor / Klinika")}
                      </div>
                      <div className="invoice-party-details">
                        {selectedDocDetails.type === "INCOME"
                          ? `Qabul qildi: Moddiy javobgar shaxs (${selectedDocDetails.warehouse?.name || "Asosiy ombor"})`
                          : `Tel: ${selectedDocDetails.customer?.phone || "—"} | Manzil: O'zbekiston Respublikasi`}
                      </div>
                    </div>
                  </div>

                  <table className="invoice-items-table">
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>№</th>
                        <th style={{ width: 80 }}>Artikul</th>
                        <th>Mahsulot nomi</th>
                        <th style={{ width: 90 }}>Partiya</th>
                        <th style={{ width: 85 }}>Muddat</th>
                        <th style={{ width: 60, textAlign: "center" }}>Birlik</th>
                        <th style={{ width: 65, textAlign: "right" }}>Miqdor</th>
                        <th style={{ width: 110, textAlign: "right" }}>Narx (so'm)</th>
                        <th style={{ width: 120, textAlign: "right" }}>Summa (so'm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDocDetails.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: "center" }}>{idx + 1}</td>
                          <td>{it.product?.sku || "—"}</td>
                          <td><strong>{it.productName || it.product?.name}</strong></td>
                          <td>{it.batchNumber || "—"}</td>
                          <td>{it.expDate || "—"}</td>
                          <td style={{ textAlign: "center" }}>dona</td>
                          <td style={{ textAlign: "right" }}>{it.quantity}</td>
                          <td style={{ textAlign: "right" }}>{formatMoney(it.sellPrice || it.costPrice)}</td>
                          <td style={{ textAlign: "right" }}><strong>{formatMoney(it.totalPrice)}</strong></td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td colSpan={6} style={{ textAlign: "right" }}><strong>JAMI TO'LOVGA:</strong></td>
                        <td style={{ textAlign: "right" }}>
                          <strong>{selectedDocDetails.items?.reduce((s, x) => s + (x.quantity || 0), 0)}</strong>
                        </td>
                        <td></td>
                        <td style={{ textAlign: "right" }}>
                          <strong style={{ color: "#0f766e" }}>{formatMoney(selectedDocDetails.totalAmount)} so'm</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="invoice-words-box">
                    <strong>Summa so'z bilan (Сумма прописью):</strong> {numberToWordsUz(selectedDocDetails.totalAmount)}
                  </div>

                  <div className="invoice-legal-note">
                    * Mazkur tovarlar sifatli, to'liq komplektatsiyada, yaroqlilik muddatlari me'yorida va shikastlanmagan holda topshirildi va qabul qilindi. Tomonlarning e'tirozlari yo'q.
                  </div>

                  <div className="invoice-signatures-grid">
                    <div className="invoice-sig-box">
                      <strong>Topshirdi (Отпустил):</strong>
                      <div className="invoice-sig-line"></div>
                      <div className="invoice-sig-sub">Moddiy javobgar shaxs (Imzo / F.I.SH)</div>
                      <div className="invoice-stamp-mark">M.O'. (Печать)</div>
                    </div>

                    <div className="invoice-sig-box">
                      <strong>Qabul qildi (Получил):</strong>
                      <div className="invoice-sig-line"></div>
                      <div className="invoice-sig-sub">Ishonchnoma № ______ / Vakil (Imzo / F.I.SH)</div>
                      <div className="invoice-stamp-mark">M.O'. (Печать)</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="erp-modal-footer">
              <button type="button" className="btn btn-erp-secondary" onClick={() => setSelectedDocDetails(null)}>
                Yopish
              </button>
              <button
                type="button"
                className="btn btn-erp-primary"
                onClick={() => {
                  setDocPrintFormat("nakladnaya");
                  setTimeout(() => window.print(), 80);
                }}
              >
                🖨️ Nakladnoyni Chop etish (A4)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 5.1: CASH RECEIPT VOUCHER (ПКО / РКО Kvitansiyasi)             */}
      {/* -------------------------------------------------------------------- */}
      {selectedCashReceipt && (
        <div className="erp-modal-overlay" onClick={() => setSelectedCashReceipt(null)}>
          <div className="erp-modal-window" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-header">
              <h3>Kassa Kvitansiyasi #{selectedCashReceipt.entryNumber}</h3>
              <button type="button" className="erp-close-btn" onClick={() => setSelectedCashReceipt(null)}>×</button>
            </div>
            <div className="erp-modal-body">
              <div className="erp-cash-voucher-sheet print-section">
                <div className="voucher-header">
                  <div style={{ fontSize: 10, letterSpacing: 1, color: "#0d9488", fontWeight: 800 }}>«MEDAX» MAS'ULIYATI CHEKLANGAN JAMIYATI</div>
                  <h4 className="voucher-title">
                    {selectedCashReceipt.type === "INCOME"
                      ? "KASSA KIRIM ORDERI KVITANSIYASI (ПКО)"
                      : "KASSA CHIQIM ORDERI (РКО)"}
                  </h4>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    № {selectedCashReceipt.entryNumber} | {formatDate(selectedCashReceipt.date)}
                  </div>
                </div>

                <div className="voucher-row">
                  <span className="voucher-label">{selectedCashReceipt.type === "INCOME" ? "Qabul qilindi (Kimdan):" : "Berildi (Kimga):"}</span>
                  <span className="voucher-val">{selectedCashReceipt.customer?.name || selectedCashReceipt.supplier?.name || "Mijoz / Hamkor"}</span>
                </div>

                <div className="voucher-row">
                  <span className="voucher-label">Asos (To'lov moddasi):</span>
                  <span className="voucher-val">{selectedCashReceipt.category}</span>
                </div>

                {selectedCashReceipt.description && (
                  <div className="voucher-row">
                    <span className="voucher-label">Izoh:</span>
                    <span className="voucher-val">{selectedCashReceipt.description}</span>
                  </div>
                )}

                <div className="voucher-row">
                  <span className="voucher-label">To'lov shakli:</span>
                  <span className="voucher-val">
                    {selectedCashReceipt.paymentType === "CASH"
                      ? "Naqd pul"
                      : selectedCashReceipt.paymentType === "CARD"
                      ? "Bank plastik kartasi"
                      : "Bank hisob raqamidan o'tkazma"}
                  </span>
                </div>

                <div className="voucher-amount-highlight">
                  <div className="voucher-amount-val">{formatMoney(selectedCashReceipt.amount)} UZS</div>
                  <div className="voucher-amount-words">({numberToWordsUz(selectedCashReceipt.amount)})</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, marginTop: 20, paddingTop: 10, borderTop: "1px dashed #cbd5e1" }}>
                  <div style={{ fontSize: 11 }}>
                    <div><strong>Bosh buxgalter:</strong></div>
                    <div style={{ borderBottom: "1px solid #475569", height: 26, margin: "6px 0 2px" }}></div>
                    <div style={{ color: "#64748b", fontSize: 10 }}>Imzo / F.I.SH</div>
                  </div>
                  <div style={{ fontSize: 11 }}>
                    <div><strong>Kassir:</strong></div>
                    <div style={{ borderBottom: "1px solid #475569", height: 26, margin: "6px 0 2px" }}></div>
                    <div style={{ color: "#64748b", fontSize: 10 }}>Imzo / F.I.SH</div>
                  </div>
                </div>

                <div style={{ textAlign: "center", marginTop: 14, fontSize: 10, color: "#94a3b8", letterSpacing: 2 }}>
                  M.O'. (MUHR O'RNI)
                </div>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button type="button" className="btn btn-erp-secondary" onClick={() => setSelectedCashReceipt(null)}>
                Yopish
              </button>
              <button type="button" className="btn btn-erp-primary" onClick={() => window.print()}>
                🖨️ Kvitansiyani Chop etish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 5.2: SHELF PRICE TAG & BARCODE (Tsennik & Shtrix-kod)          */}
      {/* -------------------------------------------------------------------- */}
      {priceTagProduct && (
        <div className="erp-modal-overlay" onClick={() => setPriceTagProduct(null)}>
          <div className="erp-modal-window" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-header">
              <h3>🏷️ Narx yorlig'i (Tsennik)</h3>
              <button type="button" className="erp-close-btn" onClick={() => setPriceTagProduct(null)}>×</button>
            </div>
            <div className="erp-modal-body" style={{ textAlign: "center" }}>
              <div className="erp-price-tag-sheet print-section">
                <div className="tag-brand">MEDAX MEDICAL STORE</div>
                <div className="tag-name">{priceTagProduct.name}</div>
                <div className="tag-price-box">
                  <span className="tag-price-val">{formatMoney(priceTagProduct.priceFrom)}</span>
                  <span className="tag-price-cur">UZS</span>
                </div>
                
                {/* Visual Barcode pattern */}
                <div style={{ margin: "10px 0" }}>
                  <svg width="200" height="40" viewBox="0 0 200 40" style={{ display: "inline-block" }}>
                    <rect x="0" y="0" width="3" height="40" fill="#000" />
                    <rect x="5" y="0" width="2" height="40" fill="#000" />
                    <rect x="9" y="0" width="4" height="40" fill="#000" />
                    <rect x="15" y="0" width="1" height="40" fill="#000" />
                    <rect x="18" y="0" width="3" height="40" fill="#000" />
                    <rect x="23" y="0" width="2" height="40" fill="#000" />
                    <rect x="27" y="0" width="5" height="40" fill="#000" />
                    <rect x="34" y="0" width="2" height="40" fill="#000" />
                    <rect x="38" y="0" width="3" height="40" fill="#000" />
                    <rect x="43" y="0" width="1" height="40" fill="#000" />
                    <rect x="46" y="0" width="4" height="40" fill="#000" />
                    <rect x="52" y="0" width="2" height="40" fill="#000" />
                    <rect x="56" y="0" width="3" height="40" fill="#000" />
                    <rect x="61" y="0" width="4" height="40" fill="#000" />
                    <rect x="67" y="0" width="2" height="40" fill="#000" />
                    <rect x="71" y="0" width="1" height="40" fill="#000" />
                    <rect x="74" y="0" width="3" height="40" fill="#000" />
                    <rect x="79" y="0" width="4" height="40" fill="#000" />
                    <rect x="85" y="0" width="2" height="40" fill="#000" />
                    <rect x="89" y="0" width="3" height="40" fill="#000" />
                    <rect x="94" y="0" width="2" height="40" fill="#000" />
                    <rect x="98" y="0" width="5" height="40" fill="#000" />
                    <rect x="105" y="0" width="1" height="40" fill="#000" />
                    <rect x="108" y="0" width="3" height="40" fill="#000" />
                    <rect x="113" y="0" width="4" height="40" fill="#000" />
                    <rect x="119" y="0" width="2" height="40" fill="#000" />
                    <rect x="123" y="0" width="3" height="40" fill="#000" />
                    <rect x="128" y="0" width="1" height="40" fill="#000" />
                    <rect x="131" y="0" width="4" height="40" fill="#000" />
                    <rect x="137" y="0" width="2" height="40" fill="#000" />
                    <rect x="141" y="0" width="5" height="40" fill="#000" />
                    <rect x="148" y="0" width="2" height="40" fill="#000" />
                    <rect x="152" y="0" width="3" height="40" fill="#000" />
                    <rect x="157" y="0" width="1" height="40" fill="#000" />
                    <rect x="160" y="0" width="4" height="40" fill="#000" />
                    <rect x="166" y="0" width="2" height="40" fill="#000" />
                    <rect x="170" y="0" width="3" height="40" fill="#000" />
                    <rect x="175" y="0" width="4" height="40" fill="#000" />
                    <rect x="181" y="0" width="2" height="40" fill="#000" />
                    <rect x="185" y="0" width="3" height="40" fill="#000" />
                    <rect x="190" y="0" width="2" height="40" fill="#000" />
                    <rect x="194" y="0" width="3" height="40" fill="#000" />
                  </svg>
                  <div style={{ fontSize: 11, letterSpacing: 2, fontFamily: "monospace", color: "#334155" }}>
                    {priceTagProduct.sku ? priceTagProduct.sku : `MDX-${String(priceTagProduct.id).padStart(6, "0")}`}
                  </div>
                </div>

                <div className="tag-footer">
                  <div>
                    <div><strong>Partiya:</strong> {priceTagProduct.batchNumber || "—"}</div>
                    <div><strong>Muddat:</strong> {priceTagProduct.expDate || "—"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>Sana: {new Date().toLocaleDateString("uz-UZ")}</div>
                    <div style={{ color: "#0d9488", fontWeight: 700 }}>medax.uz</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button type="button" className="btn btn-erp-secondary" onClick={() => setPriceTagProduct(null)}>
                Yopish
              </button>
              <button type="button" className="btn btn-erp-primary" onClick={() => window.print()}>
                🖨️ Tsennikni Chop etish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 6: LOW STOCK ALERT MODAL                                       */}
      {/* -------------------------------------------------------------------- */}
      {showLowStockModal && (
        <div className="erp-modal-overlay" onClick={() => setShowLowStockModal(false)}>
          <div className="erp-modal-window large" onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-header">
              <h3>⚠️ Kam qolgan tovarlar ro'yxati (Минимал количество)</h3>
              <button type="button" className="erp-close-btn" onClick={() => setShowLowStockModal(false)}>×</button>
            </div>
            <div className="erp-modal-body">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Tovar nomi</th>
                    <th>Joriy qoldiq</th>
                    <th>Minimal me'yor</th>
                    <th>Sotuv narxi</th>
                    <th>Yetkazib beruvchi</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.lowStock.map((it) => (
                    <tr key={it.id}>
                      <td><strong>{it.name}</strong></td>
                      <td><span className="erp-stock-badge low">{it.stock} dona</span></td>
                      <td>{it.minStock} dona</td>
                      <td>{formatMoney(it.price)} so'm</td>
                      <td>{it.supplier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="erp-modal-footer">
              <button type="button" className="btn btn-erp-secondary" onClick={() => setShowLowStockModal(false)}>
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* MODAL 7: EXPIRING GOODS MODAL                                        */}
      {/* -------------------------------------------------------------------- */}
      {showExpiringModal && (
        <div className="erp-modal-overlay" onClick={() => setShowExpiringModal(false)}>
          <div className="erp-modal-window large" onClick={(e) => e.stopPropagation()}>
            <div className="erp-modal-header">
              <h3>⏳ Yaroqlilik muddati yaqin tovarlar (Срок товары)</h3>
              <button type="button" className="erp-close-btn" onClick={() => setShowExpiringModal(false)}>×</button>
            </div>
            <div className="erp-modal-body">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Tovar nomi</th>
                    <th>Seriya #</th>
                    <th>Qoldiq</th>
                    <th>Yaroqlilik muddati</th>
                    <th>Narx</th>
                    <th>Yetkazib beruvchi</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.expiring.map((it) => (
                    <tr key={it.id}>
                      <td><strong>{it.name}</strong></td>
                      <td>{it.batch}</td>
                      <td>{it.stock} dona</td>
                      <td><span className="erp-date-badge danger">{it.expDate}</span></td>
                      <td>{formatMoney(it.price)} so'm</td>
                      <td>{it.supplier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="erp-modal-footer">
              <button type="button" className="btn btn-erp-secondary" onClick={() => setShowExpiringModal(false)}>
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
