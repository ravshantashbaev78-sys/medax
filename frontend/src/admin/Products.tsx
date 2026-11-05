import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, Brand, Category, Paged, Product, money } from "../api";
import { Pager } from "../components/Shell";
import { useAdminI18n } from "./i18n";

// ============================================================================
// Tasdiqlash modal oynasi (confirm() o'rniga zamonaviy sayt uslubidagi modal)
// ============================================================================
interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
}

function ConfirmModal({
  open,
  title,
  message,
  confirmText,
  cancelText,
  danger,
  onConfirm,
  onCancel,
}: ConfirmState & { onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="box" style={{ maxWidth: 440, padding: "24px" }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 18, color: "var(--ink, #0f172a)" }}>{title}</h3>
        <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--ink2, #64748b)", lineHeight: 1.5 }}>
          {message}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="button" className="btn ghost sm" onClick={onCancel}>
            {cancelText || "Bekor qilish"}
          </button>
          <button
            type="button"
            className="btn sm"
            onClick={onConfirm}
            style={
              danger
                ? { background: "var(--red, #ef4444)", borderColor: "var(--red, #ef4444)", color: "#fff" }
                : undefined
            }
          >
            {confirmText || "Tasdiqlash"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 1. MAHSULOTLAR RO'YXATI (ProductList)
// ============================================================================
export function ProductList() {
  const { aT } = useAdminI18n();
  const [data, setData] = useState<Paged<Product> | null>(null);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Confirm Modal holati
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const closeConfirm = () => setConfirmState((prev) => ({ ...prev, open: false }));

  const load = useCallback(() => {
    api<Paged<Product>>(`/admin/products?page=${page}&q=${encodeURIComponent(query)}`, { admin: true })
      .then((res) => {
        setData(res);
        setSelectedIds(new Set());
      })
      .catch((e) => setError(e.message));
  }, [page, query]);

  useEffect(load, [load]);

  // Yagona mahsulotni o'chirish (buyurtmada bo'lsa xavfsiz yashiriladi)
  const remove = (p: Product) => {
    setConfirmState({
      open: true,
      title: "Mahsulotni o'chirish",
      message: `"${p.name}" mahsuloti o'chirilsinmi? Agar u buyurtmalarda mavjud bo'lsa, tizim uni avtomatik tarzda xavfsiz yashiradi.`,
      confirmText: "O'chirish",
      danger: true,
      onConfirm: async () => {
        closeConfirm();
        try {
          const r = await api<{ hidden?: boolean }>(`/admin/products/${p.id}`, { method: "DELETE", admin: true });
          if (r.hidden) {
            setMsg("Mahsulot buyurtmalarda ishlatilgani sababli o'chirilmadi, faqat saytdan xavfsiz yashirildi.");
          } else {
            setMsg("Mahsulot muvaffaqiyatli o'chirildi.");
          }
          load();
        } catch (e) {
          setError((e as ApiError).message);
        }
      },
    });
  };

  // Faol/Nofaol holatini tezkor o'zgartirish
  const toggle = async (p: Product) => {
    try {
      const full = await api<Product>(`/admin/products/${p.id}`, { admin: true });
      await api(`/admin/products/${p.id}`, { method: "PUT", admin: true, json: { ...full, isActive: !p.isActive } });
      load();
    } catch (e) {
      setError((e as ApiError).message);
    }
  };

  // Tanlash (checkbox) amallari
  const allCurrentIds = data?.items.map((p) => p.id) || [];
  const allSelected = allCurrentIds.length > 0 && allCurrentIds.every((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allCurrentIds));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Ommaviy holatni o'zgartirish (faqat tanlanganlar uchun)
  const handleBulkStatus = (active: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setConfirmState({
      open: true,
      title: active ? "Mahsulotlarni ko'rsatish" : "Mahsulotlarni yashirish",
      message: active
        ? `Tanlangan ${ids.length} ta mahsulot saytda faollashtirilsinmi?`
        : `Tanlangan ${ids.length} ta mahsulot saytdan yashirilsinmi (nofaol qilinsinmi)?`,
      confirmText: active ? "Faollashtirish" : "Yashirish",
      danger: !active,
      onConfirm: async () => {
        closeConfirm();
        setBusy(true);
        setError("");
        setMsg("");
        try {
          const res = await api<{ ok: boolean; updated: number; active: boolean }>("/admin/products/bulk-status", {
            method: "POST",
            admin: true,
            json: { active, ids },
          });
          setMsg(
            active
              ? `${res.updated} ta mahsulot saytda faollashtirildi.`
              : `${res.updated} ta mahsulot saytdan yashirildi.`
          );
          load();
        } catch (e) {
          setError((e as ApiError).message);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  // Ommaviy o'chirish (faqat tanlanganlar uchun, buyurtmadagilar avtomatik yashiriladi)
  const handleBulkDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setConfirmState({
      open: true,
      title: "Tanlangan mahsulotlarni o'chirish",
      message: `Haqiqatan ham tanlangan ${ids.length} ta mahsulot o'chirilsinmi? Buyurtmalarda mavjud bo'lgan mahsulotlar o'chirilmasdan, saytdan xavfsiz yashiriladi.`,
      confirmText: `O'chirish (${ids.length})`,
      danger: true,
      onConfirm: async () => {
        closeConfirm();
        setBusy(true);
        setError("");
        setMsg("");
        try {
          const res = await api<{ ok: boolean; deleted: number; hidden?: number }>("/admin/products/bulk-delete", {
            method: "POST",
            admin: true,
            json: { ids },
          });
          let statusText = `${res.deleted} ta mahsulot butunlay o'chirildi.`;
          if (res.hidden && res.hidden > 0) {
            statusText += ` ${res.hidden} ta mahsulot esa buyurtmalar tarixini saqlash maqsadida xavfsiz yashirildi.`;
          }
          setMsg(statusText);
          load();
        } catch (e) {
          setError((e as ApiError).message);
        } finally {
          setBusy(false);
        }
      },
    });
  };

  return (
    <>
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        danger={confirmState.danger}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>{aT("products")}</h1>
        <Link className="btn" to="/admin/products/new" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {aT("add_product")}
        </Link>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <form
          className="search"
          style={{ flex: 1, maxWidth: 420 }}
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            setPage(1);
            setQuery(q.trim());
          }}
        >
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={aT("search")}
            aria-label="Qidirish"
          />
          <button className="btn sm">{aT("search")}</button>
        </form>
      </div>

      {error && <p className="err" role="alert">{error}</p>}
      {msg && <p className="ok">{msg}</p>}

      {/* Tanlanganlar uchun ixcham amallar paneli (Faqat tanlangandagina chiqadi) */}
      {selectedIds.size > 0 && (
        <div
          className="product-bulk-bar"
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            margin: "12px 0 16px",
            padding: "10px 14px",
            background: "var(--surface-card, #f8fafc)",
            borderRadius: 10,
            border: "1.5px solid var(--teal, #0d9488)",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #1e293b)" }}>
            {aT("bulk_selected")}: {selectedIds.size}
          </span>

          <button
            type="button"
            className="btn sm ghost"
            disabled={busy}
            onClick={() => handleBulkStatus(false)}
            style={{ color: "var(--red, #ef4444)", borderColor: "var(--red, #ef4444)" }}
          >
            {aT("bulk_hide")}
          </button>
          <button
            type="button"
            className="btn sm ghost"
            disabled={busy}
            onClick={() => handleBulkStatus(true)}
            style={{ color: "var(--teal, #0d9488)", borderColor: "var(--teal, #0d9488)" }}
          >
            {aT("bulk_show")}
          </button>
          <button
            type="button"
            className="btn sm"
            disabled={busy}
            onClick={handleBulkDeleteSelected}
            style={{ background: "var(--red, #ef4444)", color: "#fff", borderColor: "var(--red, #ef4444)" }}
          >
            {aT("bulk_delete")} ({selectedIds.size})
          </button>
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            {aT("cancel")}
          </button>
        </div>
      )}

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 36, textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Barchasini tanlash"
                  style={{ cursor: "pointer", width: 16, height: 16 }}
                />
              </th>
              <th style={{ width: 56 }}></th>
              <th>{aT("name")}</th>
              <th>{aT("category")}</th>
              <th>{aT("price")}</th>
              <th>{aT("stock_col")}</th>
              <th>{aT("status")}</th>
              <th>{aT("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleSelectOne(p.id)}
                    style={{ cursor: "pointer", width: 16, height: 16 }}
                    aria-label={`${p.name}`}
                  />
                </td>
                <td style={{ width: 56 }}>
                  {p.images[0] ? (
                    <img
                      src={p.images[0].thumbUrl}
                      alt=""
                      width={44}
                      height={44}
                      style={{ objectFit: "contain", borderRadius: 8, background: "var(--surface, #fff)" }}
                    />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: "var(--surface-card, #f1f5f9)" }} />
                  )}
                </td>
                <td>
                  <Link to={`/admin/products/${p.id}`} style={{ fontWeight: 600 }}>{p.name}</Link>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {p.brand?.name}{p.sku ? ` · ${p.sku}` : ""}
                  </div>
                </td>
                <td>{p.category?.name || "—"}</td>
                <td>{p.priceFrom ? money(p.priceFrom) : <span className="muted">Kelishuv asosida</span>}</td>
                <td>
                  {p.stock !== undefined && p.stock !== null ? (
                    p.stock > 0 ? (
                      <span style={{ fontWeight: 700, color: p.stock <= 5 ? "var(--warning, #d97706)" : "var(--teal, #0d9488)" }}>
                        {p.stock} {aT("unit_pcs")}
                      </span>
                    ) : (
                      <span style={{ color: "var(--red, #ef4444)", fontWeight: 600 }}>{aT("out_of_stock")}</span>
                    )
                  ) : "—"}
                </td>
                <td>
                  <button
                    type="button"
                    onClick={() => toggle(p)}
                    className="btn ghost sm"
                    style={{
                      borderColor: p.isActive ? "var(--teal, #0d9488)" : "var(--red, #ef4444)",
                      color: p.isActive ? "var(--teal, #0d9488)" : "var(--red, #ef4444)",
                      fontWeight: 600,
                    }}
                  >
                    {p.isActive ? aT("badge_active") : aT("badge_hidden")}
                  </button>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <Link className="btn ghost sm" to={`/admin/products/${p.id}`}>{aT("edit")}</Link>{" "}
                  <button className="btn ghost sm" onClick={() => remove(p)} style={{ color: "var(--red, #ef4444)" }}>
                    {aT("delete")}
                  </button>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={8} className="muted" style={{ textAlign: "center", padding: 32 }}>
                  {aT("not_found")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
    </>
  );
}

// ============================================================================
// Toifalar uchun moslashtirilgan qoidalar
// ============================================================================
interface CategoryRule {
  badgeTitle: string;
  defaultUnit: string;
  allowedUnits: { value: string; label: string }[];
  showPackageQty: boolean;
  packageQtyLabel?: string;
  showDates: boolean;
  warrantyRecommended: boolean;
  quickSpecs: string[];
  specPlaceholders: Record<string, string>;
}

const CATEGORY_RULES: Record<string, CategoryRule> = {
  "tibbiy-buyumlar": {
    badgeTitle: "Sarflov materiallari (Shprits, bint, qo'lqop, kateterlar)",
    defaultUnit: "dona",
    allowedUnits: [
      { value: "dona", label: "dona (1 ta)" },
      { value: "quti", label: "quti (blok)" },
      { value: "pachka", label: "pachka" },
      { value: "o'ram", label: "o'ram (rulon)" },
      { value: "juft", label: "juft (qo'lqop)" },
      { value: "komplekt", label: "komplekt" },
    ],
    showPackageQty: true,
    packageQtyLabel: "Qutidagi dona soni (donalab hisoblash uchun)",
    showDates: true,
    warrantyRecommended: false,
    quickSpecs: ["Sterillik", "O'lchami", "Material", "Qadoqdagi soni"],
    specPlaceholders: {
      "Sterillik": "Steril yoki Nosteril",
      "O'lchami": "Masalan: 5ml, 21G, L o'lcham",
      "Material": "Lateks, Nitril, Doka va h.k.",
      "Qadoqdagi soni": "Masalan: 50 ta / 100 ta",
    },
  },
  "tibbiy-apparaturalar": {
    badgeTitle: "Tibbiy apparatura (UZI, Rentgen, EKG, Monitorlar)",
    defaultUnit: "dona",
    allowedUnits: [
      { value: "dona", label: "dona (1 apparat)" },
      { value: "komplekt", label: "komplekt (tizim / stansiya)" },
    ],
    showPackageQty: false,
    showDates: false,
    warrantyRecommended: true,
    quickSpecs: ["Ekran", "Quvvat sarfi", "Datchiklar", "Ishlash rejimlari", "Kanallar soni", "Akkumulyator"],
    specPlaceholders: {
      "Ekran": "Masalan: 15.6 dyuymli HD displey",
      "Quvvat sarfi": "Masalan: 220V, 50Hz, 150W",
      "Datchiklar": "Konveks, chiziqli, kardiologik fazali datchiklar",
      "Ishlash rejimlari": "B, M, Color Doppler, Power Doppler, PW",
      "Kanallar soni": "Masalan: 12 kanalli sinxron yozuv",
      "Akkumulyator": "Kamida 3 soat uzluksiz avtonom ishlash",
    },
  },
  "tibbiy-jihozlar": {
    badgeTitle: "Tibbiy jihozlar & Mebel (Jarrohlik stollari, funksional karavotlar)",
    defaultUnit: "dona",
    allowedUnits: [
      { value: "dona", label: "dona (1 jihoz)" },
      { value: "komplekt", label: "komplekt (to'plam)" },
    ],
    showPackageQty: false,
    showDates: false,
    warrantyRecommended: true,
    quickSpecs: ["Maksimal yuklama", "O'lchamlari", "Boshqaruv turi", "Material", "Balandlikni sozlash"],
    specPlaceholders: {
      "Maksimal yuklama": "Masalan: 250 kg gacha",
      "O'lchamlari": "Masalan: 2150 x 950 x 500 mm",
      "Boshqaruv turi": "Elektr pult orqali / Gidravlik pedal",
      "Material": "Tibbiy zanglamas po'lat (AISI 304)",
      "Balandlikni sozlash": "500 mm dan 850 mm gacha",
    },
  },
  "laboratoriya-reagentlari": {
    badgeTitle: "Laboratoriya reagentlari & Test to'plamlari",
    defaultUnit: "flakon",
    allowedUnits: [
      { value: "flakon", label: "flakon / ampula" },
      { value: "to'plam", label: "to'plam (test kiti)" },
      { value: "litr", label: "litr" },
      { value: "quti", label: "quti" },
      { value: "dona", label: "dona" },
    ],
    showPackageQty: true,
    packageQtyLabel: "1 to'plamdagi testlar yoki flakonlar soni",
    showDates: true,
    warrantyRecommended: false,
    quickSpecs: ["Saqlash harorati", "Testlar soni", "Turi (shakli)", "Reaksiya vaqti"],
    specPlaceholders: {
      "Saqlash harorati": "Masalan: +2°C ... +8°C",
      "Testlar soni": "Masalan: 100 ta test uchun to'plam",
      "Turi (shakli)": "Liofilizatsiyalangan kukun / Suyuq reagent",
      "Reaksiya vaqti": "10-15 daqiqa inkubatsiya",
    },
  },
  "ortopedik-mahsulotlar": {
    badgeTitle: "Ortopedik mahsulotlar & Aravachalar",
    defaultUnit: "dona",
    allowedUnits: [
      { value: "dona", label: "dona (1 ta)" },
      { value: "juft", label: "juft (qo'ltiqtayoq)" },
      { value: "komplekt", label: "komplekt" },
    ],
    showPackageQty: false,
    showDates: false,
    warrantyRecommended: true,
    quickSpecs: ["O'lchami", "Maksimal yuklama", "Akkumulyator", "Og'irligi", "Fiksatsiya darajasi"],
    specPlaceholders: {
      "O'lchami": "Masalan: S, M, L, XL yoki Universal",
      "Maksimal yuklama": "Masalan: 120 kg gacha",
      "Akkumulyator": "24V 12Ah litiy batareya",
      "Og'irligi": "Masalan: 14 kg",
      "Fiksatsiya darajasi": "Qattiq / Yarim qattiq",
    },
  },
};

const DEFAULT_CATEGORY_RULE: CategoryRule = {
  badgeTitle: "Umumiy tibbiy mahsulot",
  defaultUnit: "dona",
  allowedUnits: [
    { value: "dona", label: "dona" },
    { value: "komplekt", label: "komplekt" },
    { value: "quti", label: "quti" },
    { value: "pachka", label: "pachka" },
  ],
  showPackageQty: false,
  showDates: false,
  warrantyRecommended: true,
  quickSpecs: ["O'lchami", "Material", "Kafolat"],
  specPlaceholders: {},
};

const STANDARD_COUNTRIES = [
  "O'zbekiston",
  "Germaniya",
  "Xitoy",
  "Turkiya",
  "Janubiy Koreya",
  "Yaponiya",
  "Rossiya",
  "AQSH",
  "Italiya",
  "Shveysariya",
  "Hindiston",
  "Buyuk Britaniya",
  "Polsha",
  "Fransiya",
  "Isroil",
  "Chexiya",
  "Avstriya",
  "Niderlandiya",
  "Belgiya",
  "Ispaniya",
];

const empty = {
  name: "",
  nameRu: "",
  nameEn: "",
  sku: "",
  description: "",
  descriptionRu: "",
  descriptionEn: "",
  country: "",
  priceFrom: "" as string | number,
  oldPrice: "" as string | number,
  discountPercent: "" as string | number,
  unit: "dona",
  packageQty: 1 as string | number,
  stock: 0 as string | number,
  mfdDate: "",
  expDate: "",
  isHit: false,
  isNew: false,
  isActive: true,
  categoryId: "" as string | number,
  brandId: "" as string | number,
  specs: [] as { name: string; value: string }[],
};

// ============================================================================
// 2. MAHSULOT QO'SHISH VA TAHRIRLASH FORMASI (ProductForm)
// ============================================================================
export function ProductForm() {
  const { aT, lang } = useAdminI18n();
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = !id || id === "new";

  const [f, setF] = useState(empty);
  const [warranty, setWarranty] = useState("");
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [images, setImages] = useState<Product["images"]>([]);
  const [newFiles, setNewFiles] = useState<{ file: File; preview: string }[]>([]);
  const [docs, setDocs] = useState<NonNullable<Product["documents"]>>([]);

  // Yig'ma bo'limlar holati (Accordion)
  const [showOtherLangs, setShowOtherLangs] = useState(false);
  const [showExtraDetails, setShowExtraDetails] = useState(false);

  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Category[]>("/admin/categories", { admin: true }).then(setCats);
    api<Brand[]>("/admin/brands", { admin: true }).then(setBrands);
  }, []);

  useEffect(() => {
    if (isNew) {
      setF(empty);
      setWarranty("");
      setIsNegotiable(false);
      setImages([]);
      setDocs([]);
      return;
    }
    api<Product>(`/admin/products/${id}`, { admin: true })
      .then((p) => {
        setF({
          name: p.name,
          nameRu: p.nameRu || "",
          nameEn: p.nameEn || "",
          sku: p.sku || "",
          description: p.description,
          descriptionRu: p.descriptionRu || "",
          descriptionEn: p.descriptionEn || "",
          country: p.country || "",
          priceFrom: p.priceFrom ? Number(p.priceFrom) : "",
          oldPrice: p.oldPrice ? Number(p.oldPrice) : "",
          discountPercent: p.discountPercent ?? "",
          unit: p.unit || "dona",
          packageQty: p.packageQty || 1,
          stock: p.stock !== undefined ? p.stock : 0,
          mfdDate: p.mfdDate ? p.mfdDate.slice(0, 10) : "",
          expDate: p.expDate ? p.expDate.slice(0, 10) : "",
          isHit: p.isHit,
          isNew: p.isNew,
          isActive: p.isActive,
          categoryId: p.categoryId,
          brandId: p.brandId || "",
          specs: p.specs || [],
        });
        setIsNegotiable(!p.priceFrom);
        const warSpec = p.specs?.find((s) => s.name === "Kafolat")?.value || "";
        setWarranty(warSpec);
        setImages(p.images);
        setDocs(p.documents || []);

        // Agar boshqa tillarda matn bo'lsa, til bo'limini ochiq ko'rsatish
        if (p.nameRu || p.nameEn || p.descriptionRu || p.descriptionEn) {
          setShowOtherLangs(true);
        }
        // Agar qo'shimcha parametrlar bo'lsa, qo'shimcha bo'limni ochiq ko'rsatish
        if (p.sku || p.country || p.oldPrice || p.mfdDate || p.expDate || (p.specs && p.specs.length > 0)) {
          setShowExtraDetails(true);
        }
      })
      .catch((e) => setError(e.message));
  }, [id, isNew]);

  const set = (k: keyof typeof empty, v: any) => setF((s) => ({ ...s, [k]: v }));

  const selectedCat = cats.find((c) => String(c.id) === String(f.categoryId));
  const catSlug = selectedCat?.slug || "";
  const catRule = CATEGORY_RULES[catSlug] || DEFAULT_CATEGORY_RULE;

  const handleCategoryChange = (catId: string) => {
    const chosenCat = cats.find((c) => String(c.id) === catId);
    const rule = chosenCat ? CATEGORY_RULES[chosenCat.slug] || DEFAULT_CATEGORY_RULE : DEFAULT_CATEGORY_RULE;

    setF((prev) => {
      const isCurrentUnitAllowed = rule.allowedUnits.some((u) => u.value === prev.unit);
      const nextUnit = isCurrentUnitAllowed ? prev.unit : rule.defaultUnit;
      const nextPackageQty = rule.showPackageQty ? prev.packageQty || 1 : 1;
      return {
        ...prev,
        categoryId: catId,
        unit: nextUnit,
        packageQty: nextPackageQty,
      };
    });
  };

  const addQuickSpec = (specName: string) => {
    const placeholder = catRule.specPlaceholders[specName] || "";
    setF((prev) => {
      const exists = prev.specs.some((s) => s.name.toLowerCase() === specName.toLowerCase());
      if (exists) return prev;
      return {
        ...prev,
        specs: [...prev.specs, { name: specName, value: placeholder }],
      };
    });
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");

    const otherSpecs = f.specs.filter((s) => s.name.trim() && s.value.trim() && s.name !== "Kafolat");
    if (warranty.trim()) {
      otherSpecs.unshift({ name: "Kafolat", value: warranty.trim() });
    }

    const calculatedPrice = isNegotiable ? null : f.priceFrom === "" ? null : Number(f.priceFrom);

    const body = {
      ...f,
      priceFrom: calculatedPrice,
      oldPrice: f.oldPrice === "" ? null : Number(f.oldPrice),
      discountPercent: f.discountPercent === "" ? null : Number(f.discountPercent),
      packageQty: catRule.showPackageQty ? (f.packageQty === "" ? 1 : Number(f.packageQty)) : 1,
      stock: f.stock === "" ? 0 : Math.max(0, Number(f.stock)),
      unit: f.unit || catRule.defaultUnit,
      mfdDate: catRule.showDates ? f.mfdDate || null : null,
      expDate: catRule.showDates ? f.expDate || null : null,
      brandId: f.brandId === "" ? null : Number(f.brandId),
      categoryId: Number(f.categoryId),
      specs: otherSpecs,
    };

    try {
      if (isNew) {
        const p = await api<Product>("/admin/products", { json: body, admin: true });
        if (newFiles.length > 0) {
          try {
            const fd = new FormData();
            newFiles.forEach((x) => fd.append("files", x.file));
            await api(`/admin/products/${p.id}/images`, { form: fd, admin: true });
          } catch (imgErr) {
            nav(`/admin/products/${p.id}`);
            throw new Error(`Mahsulot qo'shildi, lekin rasm yuklashda xatolik yuz berdi: ${(imgErr as any)?.message || ""}`);
          }
        }
        nav("/admin/products");
      } else {
        await api(`/admin/products/${id}`, { method: "PUT", json: body, admin: true });
        setMsg("Mahsulot muvaffaqiyatli saqlandi.");
      }
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const onPickNewFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const added = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setNewFiles((cur) => [...cur, ...added]);
    e.target.value = "";
  };

  const removeNewFile = (idx: number) => {
    setNewFiles((cur) => {
      const target = cur[idx];
      if (target) URL.revokeObjectURL(target.preview);
      return cur.filter((_, i) => i !== idx);
    });
  };

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fd = new FormData();
    Array.from(files).forEach((x) => fd.append("files", x));
    try {
      const added = await api<Product["images"]>(`/admin/products/${id}/images`, { form: fd, admin: true });
      setImages((cur) => [...cur, ...added]);
    } catch (err) {
      setError((err as ApiError).message);
    }
    e.target.value = "";
  };

  const uploadDoc = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", file.name.replace(/\.pdf$/i, ""));
    try {
      const d = await api<NonNullable<Product["documents"]>[number]>(`/admin/products/${id}/documents`, {
        form: fd,
        admin: true,
      });
      setDocs((cur) => [...cur, d]);
    } catch (err) {
      setError((err as ApiError).message);
    }
    e.target.value = "";
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 style={{ margin: 0 }}>
          {isNew
            ? (lang === "ru" ? "Новый товар" : lang === "en" ? "New Product" : "Yangi mahsulot")
            : (lang === "ru" ? "Редактирование товара" : lang === "en" ? "Edit Product" : "Mahsulotni tahrirlash")}
        </h1>
        <Link className="btn ghost sm" to="/admin/products">
          ← {aT("back")}
        </Link>
      </div>

      {error && <p className="err" role="alert">{error}</p>}
      {msg && <p className="ok">{msg}</p>}

      {/* Tanlangan toifa haqida ixcham va toza ma'lumot */}
      {selectedCat && (
        <div
          style={{
            padding: "8px 14px",
            background: "rgba(13, 148, 136, 0.08)",
            borderRadius: 8,
            border: "1px solid rgba(13, 148, 136, 0.2)",
            marginBottom: 16,
            maxWidth: 860,
            fontSize: 13,
            color: "var(--teal, #0d9488)",
          }}
        >
          <strong>Toifa:</strong> {catRule.badgeTitle}
        </div>
      )}

      <form onSubmit={save} style={{ maxWidth: 860, width: "100%" }}>
        {/* ============================================================== */}
        {/* 1. ASOSIY MA'LUMOTLAR (Doim ko'rinadigan qulay blok)             */}
        {/* ============================================================== */}
        <div
          style={{
            background: "var(--surface-card, #f8fafc)",
            border: "1px solid var(--line, #e2e8f0)",
            borderRadius: 14,
            padding: "18px 20px",
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "var(--ink, #0f172a)" }}>
            {aT("basic_info")}
          </h3>

          <div className="formgrid">
            <div className="field full">
              <label htmlFor="name">Mahsulot nomi (O'zbekcha) *</label>
              <input
                id="name"
                type="text"
                required
                placeholder="Masalan: UZI apparati Mindray DC-70 yoki Steril shprits 5ml"
                value={f.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="cat">Kategoriya *</label>
              <select
                id="cat"
                required
                value={f.categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                <option value="">Tanlang</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="br">Brend</label>
              <select id="br" value={f.brandId} onChange={(e) => set("brandId", e.target.value)}>
                <option value="">Brendsiz</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Narx maydoni va Kelishuv asosida katakchasi */}
            <div className="field">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <label htmlFor="pr" style={{ margin: 0 }}>
                  Sotuv narxi (UZS) {!isNegotiable && "*"}
                </label>
                <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5, cursor: "pointer", color: "var(--ink2)" }}>
                  <input
                    type="checkbox"
                    checked={isNegotiable}
                    onChange={(e) => {
                      setIsNegotiable(e.target.checked);
                      if (e.target.checked) set("priceFrom", "");
                    }}
                  />
                  {aT("negotiable_price")}
                </label>
              </div>
              <input
                id="pr"
                type="number"
                min={0}
                disabled={isNegotiable}
                required={!isNegotiable}
                placeholder={isNegotiable ? "Kelishuv asosida (narxsiz)" : "Masalan: 45000000"}
                value={f.priceFrom}
                onChange={(e) => set("priceFrom", e.target.value)}
                style={isNegotiable ? { opacity: 0.6, background: "var(--surface-muted, #f1f5f9)" } : undefined}
              />
            </div>

            {/* Ombordagi qoldiq */}
            <div className="field">
              <label htmlFor="stock">
                Ombordagi qoldiq (dona) *
              </label>
              <input
                id="stock"
                type="number"
                min={0}
                required
                placeholder="0"
                value={f.stock}
                onChange={(e) => set("stock", e.target.value)}
              />
            </div>

            {/* O'lchov birligi */}
            <div className="field">
              <label htmlFor="unit">O'lchov birligi</label>
              <select id="unit" value={f.unit} onChange={(e) => set("unit", e.target.value)}>
                {catRule.allowedUnits.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>

            {/* Saytda ko'rinishi */}
            <div className="field" style={{ display: "flex", alignItems: "center", paddingTop: 26 }}>
              <label style={{ cursor: "pointer", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, color: f.isActive ? "var(--teal, #0d9488)" : "var(--red, #ef4444)" }}>
                <input
                  type="checkbox"
                  checked={f.isActive}
                  onChange={(e) => set("isActive", e.target.checked)}
                />
                {f.isActive ? "Saytda ko'rinsin (Faol)" : "Saytdan yashirilsin (Nofaol)"}
              </label>
            </div>
          </div>

          {/* Rasmlar yuklash qismi */}
          <div style={{ marginTop: 16, borderTop: "1px solid var(--line, #e2e8f0)", paddingTop: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
              Mahsulot rasmlari
            </label>
            <div className="imgs" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              {newFiles.map((nf, i) => (
                <div
                  className="it"
                  key={`new-${i}`}
                  style={{
                    position: "relative",
                    width: 80,
                    height: 80,
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "2px solid var(--teal, #0d9488)",
                  }}
                >
                  <img src={nf.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    type="button"
                    aria-label="O'chirish"
                    onClick={() => removeNewFile(i)}
                    style={{
                      position: "absolute",
                      top: 2,
                      right: 2,
                      background: "rgba(0,0,0,0.7)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: 20,
                      height: 20,
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 12,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}

              {images.map((im) => (
                <div className="it" key={im.id} style={{ width: 80, height: 80 }}>
                  <img src={im.thumbUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    type="button"
                    aria-label="Rasmni o'chirish"
                    onClick={async () => {
                      await api(`/admin/images/${im.id}`, { method: "DELETE", admin: true });
                      setImages((c) => c.filter((x) => x.id !== im.id));
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <label
              className="btn ghost sm"
              style={{
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                fontWeight: 600,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              {isNew || newFiles.length > 0 ? "Rasmlarni tanlash" : "Rasm yuklash"}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={isNew ? onPickNewFiles : upload}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. BOSHQA TILLAR (RU / EN) - Yig'ma bo'lim                      */}
        {/* ============================================================== */}
        <div
          style={{
            background: "var(--surface-card, #f8fafc)",
            border: "1px solid var(--line, #e2e8f0)",
            borderRadius: 14,
            marginBottom: 16,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setShowOtherLangs(!showOtherLangs)}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--ink, #0f172a)",
              textAlign: "left",
            }}
          >
            <span>{aT("other_langs")}</span>
            <span style={{ fontSize: 13, color: "var(--ink2)" }}>
              {showOtherLangs ? "▲ Yashirish" : "▼ Ko'rsatish"}
            </span>
          </button>

          {showOtherLangs && (
            <div style={{ padding: "0 20px 18px", borderTop: "1px solid var(--line, #e2e8f0)", paddingTop: 14 }}>
              <div className="formgrid">
                <div className="field">
                  <label htmlFor="nameRu">Nomi (Русский)</label>
                  <input
                    id="nameRu"
                    type="text"
                    placeholder="Например: УЗИ аппарат Mindray DC-70"
                    value={f.nameRu}
                    onChange={(e) => set("nameRu", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="nameEn">Nomi (English)</label>
                  <input
                    id="nameEn"
                    type="text"
                    placeholder="e.g. Ultrasound System Mindray DC-70"
                    value={f.nameEn}
                    onChange={(e) => set("nameEn", e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="dRu">Tavsif (Русский)</label>
                  <textarea
                    id="dRu"
                    value={f.descriptionRu}
                    onChange={(e) => set("descriptionRu", e.target.value)}
                    style={{ minHeight: 90 }}
                    placeholder="Медицинское описание и характеристики на русском..."
                  />
                </div>

                <div className="field">
                  <label htmlFor="dEn">Tavsif (English)</label>
                  <textarea
                    id="dEn"
                    value={f.descriptionEn}
                    onChange={(e) => set("descriptionEn", e.target.value)}
                    style={{ minHeight: 90 }}
                    placeholder="Medical description and specifications in English..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 3. QO'SHIMCHA MA'LUMOTLAR VA TEXNIK PARAMETRLAR                */}
        {/* ============================================================== */}
        <div
          style={{
            background: "var(--surface-card, #f8fafc)",
            border: "1px solid var(--line, #e2e8f0)",
            borderRadius: 14,
            marginBottom: 20,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            onClick={() => setShowExtraDetails(!showExtraDetails)}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 20px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--ink, #0f172a)",
              textAlign: "left",
            }}
          >
            <span>{aT("extra_info")}</span>
            <span style={{ fontSize: 13, color: "var(--ink2)" }}>
              {showExtraDetails ? "▲ Yashirish" : "▼ Ko'rsatish"}
            </span>
          </button>

          {showExtraDetails && (
            <div style={{ padding: "0 20px 20px", borderTop: "1px solid var(--line, #e2e8f0)", paddingTop: 14 }}>
              <div className="formgrid">
                <div className="field">
                  <label htmlFor="sku">Artikul / Model kodi</label>
                  <input
                    id="sku"
                    type="text"
                    placeholder="Masalan: DC-70 yoki MDX-001"
                    value={f.sku}
                    onChange={(e) => set("sku", e.target.value)}
                  />
                </div>

                {/* Ishlab chiqarilgan davlat: Ro'yxatdan tanlash */}
                <div className="field">
                  <label htmlFor="co">Ishlab chiqarilgan davlat</label>
                  <input
                    id="co"
                    type="text"
                    list="country-options"
                    placeholder="Tanlang yoki yozing"
                    value={f.country}
                    onChange={(e) => set("country", e.target.value)}
                  />
                  <datalist id="country-options">
                    {STANDARD_COUNTRIES.map((country) => (
                      <option key={country} value={country} />
                    ))}
                  </datalist>
                </div>

                <div className="field">
                  <label htmlFor="oldpr">
                    Asl narx / Eski narx (UZS)
                    <span style={{ fontSize: 11, color: "var(--ink2)", marginLeft: 6 }}>(Aksiya uchun)</span>
                  </label>
                  <input
                    id="oldpr"
                    type="number"
                    min={0}
                    placeholder="Masalan: 120000"
                    value={f.oldPrice}
                    onChange={(e) => set("oldPrice", e.target.value)}
                  />
                </div>

                {/* Qutidagi dona soni (faqat tegishli toifalar uchun) */}
                {catRule.showPackageQty && (
                  <div className="field">
                    <label htmlFor="pkg">
                      {catRule.packageQtyLabel || "Qutidagi dona soni"}
                    </label>
                    <input
                      id="pkg"
                      type="number"
                      min={1}
                      placeholder="Masalan: 50 yoki 100"
                      value={f.packageQty}
                      onChange={(e) => set("packageQty", e.target.value)}
                    />
                  </div>
                )}

                {/* Sanalar: type="date" bilan tartibli kiritish */}
                {catRule.showDates && (
                  <>
                    <div className="field">
                      <label htmlFor="mfddate">Ishlab chiqarilgan sana (Mfd)</label>
                      <input
                        id="mfddate"
                        type="date"
                        value={f.mfdDate}
                        onChange={(e) => set("mfdDate", e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="expdate">Yaroqlilik muddati (Exp)</label>
                      <input
                        id="expdate"
                        type="date"
                        value={f.expDate}
                        onChange={(e) => set("expDate", e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Kafolat muddati */}
                <div className="field">
                  <label htmlFor="war">
                    Kafolat muddati
                    {catRule.warrantyRecommended && (
                      <span style={{ fontSize: 11, color: "var(--teal)", marginLeft: 6 }}>(Tavsiya etiladi)</span>
                    )}
                  </label>
                  <input
                    id="war"
                    type="text"
                    placeholder="Masalan: 12 oy yoki 2 yil rasmiy kafolat"
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                  />
                </div>

                <div className="check" style={{ alignSelf: "end", display: "flex", gap: 14, flexWrap: "wrap", paddingBottom: 6 }}>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" checked={f.isHit} onChange={(e) => set("isHit", e.target.checked)} />
                    Ommabop model (Xit)
                  </label>
                  <label style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" checked={f.isNew} onChange={(e) => set("isNew", e.target.checked)} />
                    Yangi kelgan mahsulot
                  </label>
                </div>

                {/* Tavsif (O'zbekcha) */}
                <div className="field full">
                  <label htmlFor="d">Tavsif (O'zbekcha)</label>
                  <textarea
                    id="d"
                    value={f.description}
                    onChange={(e) => set("description", e.target.value)}
                    style={{ minHeight: 90 }}
                    placeholder="Mahsulot haqida to'liq tibbiy ma'lumot va afzalliklari..."
                  />
                </div>
              </div>

              {/* Texnik xususiyatlar */}
              <div style={{ marginTop: 18 }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "var(--ink)" }}>Texnik parametrlar</h4>
                {catRule.quickSpecs.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--ink2)", fontWeight: 600 }}>Tavsiya etilgan:</span>
                    {catRule.quickSpecs.map((spec) => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => addQuickSpec(spec)}
                        className="btn ghost sm"
                        style={{
                          fontSize: 11.5,
                          padding: "2px 8px",
                          borderRadius: 12,
                          borderColor: "var(--line)",
                        }}
                      >
                        + {spec}
                      </button>
                    ))}
                  </div>
                )}

                {f.specs.map((s, i) => (
                  <div className="specrow" key={i} style={{ marginBottom: 8 }}>
                    <input
                      type="text"
                      placeholder="Xususiyat nomi (masalan, Ekran)"
                      value={s.name}
                      onChange={(e) => set("specs", f.specs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                      aria-label="Xususiyat nomi"
                    />
                    <input
                      type="text"
                      placeholder={catRule.specPlaceholders[s.name] || "Qiymati"}
                      value={s.value}
                      onChange={(e) => set("specs", f.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                      aria-label="Xususiyat qiymati"
                    />
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => set("specs", f.specs.filter((_, j) => j !== i))}
                      style={{ color: "var(--red)" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => set("specs", [...f.specs, { name: "", value: "" }])}
                >
                  + Parametr qo'shish
                </button>
              </div>

              {/* PDF Hujjatlar */}
              <div style={{ marginTop: 20, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 14, color: "var(--ink)" }}>Hujjatlar (PDF pasport / sertifikat)</h4>
                {docs.length > 0 && (
                  <div className="docs" style={{ margin: "8px 0" }}>
                    {docs.map((d) => (
                      <span key={d.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginRight: 10 }}>
                        <a href={d.url} target="_blank" rel="noopener">PDF · {d.title}</a>
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={async () => {
                            await api(`/admin/documents/${d.id}`, { method: "DELETE", admin: true });
                            setDocs((c) => c.filter((x) => x.id !== d.id));
                          }}
                          style={{ padding: "2px 6px", fontSize: 11, color: "var(--red)" }}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {!isNew ? (
                  <input type="file" accept="application/pdf" onChange={uploadDoc} aria-label="PDF yuklash" />
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--ink2)" }}>
                    Mahsulot bazaga kiritilgach, tahrirlash oynasida qo'shimcha PDF sertifikatlarini biriktirish mumkin.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="row" style={{ marginTop: 20 }}>
          <button className="btn" disabled={busy}>
            {busy ? aT("saving") : aT("save")}
          </button>
          <Link className="btn ghost" to="/admin/products">
            {aT("back")}
          </Link>
        </div>
      </form>
    </>
  );
}
