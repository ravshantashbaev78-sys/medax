import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, Brand, Category, Paged, Product, money } from "../api";
import { Pager } from "../components/Shell";
import { useAdminI18n } from "./i18n";

export function ProductList() {
  const { aT, lang } = useAdminI18n();
  const [data, setData] = useState<Paged<Product> | null>(null);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    api<Paged<Product>>(`/admin/products?page=${page}&q=${encodeURIComponent(query)}`, { admin: true })
      .then((res) => {
        setData(res);
        setSelectedIds(new Set());
      })
      .catch((e) => setError(e.message));
  }, [page, query]);

  useEffect(load, [load]);

  const remove = async (p: Product) => {
    if (!confirm(`"${p.name}" o'chirilsinmi?`)) return;
    try {
      const r = await api<{ hidden?: boolean }>(`/admin/products/${p.id}`, { method: "DELETE", admin: true });
      if (r.hidden) alert("Mahsulot buyurtmalarda ishlatilgan, shuning uchun o'chirilmadi, faqat saytdan yashirildi.");
      load();
    } catch (e) {
      setError((e as ApiError).message);
    }
  };

  const toggle = async (p: Product) => {
    const full = await api<Product>(`/admin/products/${p.id}`, { admin: true });
    await api(`/admin/products/${p.id}`, { method: "PUT", admin: true, json: { ...full, isActive: !p.isActive } });
    load();
  };

  // Checkbox amallari
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

  // Ommaviy holatni o'zgartirish (Yo'q qilib qo'yish / ko'rsatish)
  const handleBulkStatus = async (active: boolean, targetIds?: number[]) => {
    const isAll = !targetIds || targetIds.length === 0;
    const count = isAll ? (data?.total || 0) : targetIds.length;

    const actionText = active
      ? (isAll ? "BARCHA mahsulotlar saytda ko'rsatilsinmi (faol qilinsinmi)?" : `${count} ta mahsulot saytda faol qilinsinmi?`)
      : (isAll ? "BARCHA mahsulotlar saytdan yashirilsinmi (nofaol / yo'q qilib qo'yilsinmi)?" : `${count} ta mahsulot yashirilsinmi?`);

    if (!confirm(actionText)) return;

    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await api<{ ok: boolean; updated: number; active: boolean }>("/admin/products/bulk-status", {
        method: "POST",
        admin: true,
        json: { active, ids: targetIds },
      });
      setMsg(
        active
          ? `${res.updated} ta mahsulot saytda muvaffaqiyatli faollashtirildi.`
          : `${res.updated} ta mahsulot saytdan yashirildi (nofaol qilindi).`
      );
      load();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  // Ommaviy yoki Barchasini birdaniga o'chirish
  const handleBulkDelete = async (targetIds?: number[]) => {
    const isAll = !targetIds || targetIds.length === 0;

    if (isAll) {
      const firstConfirm = confirm(
        "⚠️ DIQQAT! BAZADAGI BARCHA MAHSULOTLAR VA ULARNING RASMLARI BUTUNLAY O'CHIRILADI!\n\nBu amalni ortga qaytarib bo'lmaydi. Rozimisiz?"
      );
      if (!firstConfirm) return;

      const secondConfirm = confirm(
        "Tasdiqlash uchun: Haqiqatan ham barcha mahsulotlarni butunlay tozalashni tasdiqlaysizmi?"
      );
      if (!secondConfirm) return;
    } else {
      if (!confirm(`Haqiqatan ham tanlangan ${targetIds.length} ta mahsulot butunlay o'chirilsinmi?`)) return;
    }

    setBusy(true);
    setError("");
    setMsg("");
    try {
      const res = await api<{ ok: boolean; deleted: number }>("/admin/products/delete-all", {
        method: "POST",
        admin: true,
        json: { ids: targetIds },
      });
      setMsg(`${res.deleted} ta mahsulot butunlay o'chirildi.`);
      load();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>{aT("products")}</h1>
      <div className="row">
        <form className="search" style={{ flex: 1, maxWidth: 420 }} onSubmit={(e: FormEvent) => { e.preventDefault(); setPage(1); setQuery(q.trim()); }}>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={aT("search")} aria-label="Qidirish" />
          <button className="btn sm">{aT("search")}</button>
        </form>
        <span className="grow" />
        <Link className="btn" to="/admin/products/new">➕ {aT("add_product")}</Link>
      </div>

      {error && <p className="err">{error}</p>}
      {msg && <p className="ok">{msg}</p>}

      {/* Tezkor Ommaviy Boshqaruv Paneli (Yashirish, Ko'rsatish, Barchasini o'chirish) */}
      <div
        className="product-bulk-bar"
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          margin: "14px 0",
          padding: "10px 14px",
          background: "var(--card, #f8fafc)",
          borderRadius: 10,
          border: "1px solid var(--line, #e2e8f0)",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink, #1e293b)" }}>
          {selectedIds.size > 0 ? `Tanlandi: ${selectedIds.size} ta` : "Tezkor amallar:"}
        </span>

        {selectedIds.size > 0 ? (
          <>
            <button
              type="button"
              className="btn sm ghost"
              disabled={busy}
              onClick={() => handleBulkStatus(false, Array.from(selectedIds))}
              style={{ color: "#ef4444", borderColor: "#fca5a5" }}
            >
              🙈 Tanlanganlarni yashirish
            </button>
            <button
              type="button"
              className="btn sm ghost"
              disabled={busy}
              onClick={() => handleBulkStatus(true, Array.from(selectedIds))}
              style={{ color: "#10b981", borderColor: "#86efac" }}
            >
              👁️ Tanlanganlarni ko'rsatish
            </button>
            <button
              type="button"
              className="btn sm"
              disabled={busy}
              onClick={() => handleBulkDelete(Array.from(selectedIds))}
              style={{ background: "#dc2626", color: "#fff", borderColor: "#dc2626" }}
            >
              🗑️ Tanlanganlarni o'chirish ({selectedIds.size})
            </button>
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Bekor qilish
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn sm ghost"
              disabled={busy}
              onClick={() => handleBulkStatus(false)}
              style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}
              title="Barcha mahsulotlarni sayt katalogidan va qidiruvidan yashirib qo'yish"
            >
              🙈 Barchasini yashirish (Nofaol qilish)
            </button>
            <button
              type="button"
              className="btn sm ghost"
              disabled={busy}
              onClick={() => handleBulkStatus(true)}
              style={{ color: "#10b981", borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.05)" }}
              title="Barcha mahsulotlarni saytda yana ko'rinadigan qilish"
            >
              👁️ Barchasini ko'rsatish (Faol qilish)
            </button>
            <button
              type="button"
              className="btn sm"
              disabled={busy}
              onClick={() => handleBulkDelete()}
              style={{ background: "#ef4444", color: "#fff", borderColor: "#ef4444" }}
              title="Bazadagi barcha mahsulotlarni birdaniga o'chirish"
            >
              🗑️ Barcha mahsulotlarni o'chirish
            </button>
          </>
        )}
      </div>

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
              <th></th>
              <th>{aT("name")}</th>
              <th>{aT("category")}</th>
              <th>{aT("price")}</th>
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
                    aria-label={`${p.name} ni tanlash`}
                  />
                </td>
                <td style={{ width: 56 }}>
                  {p.images[0] && (
                    <img
                      src={p.images[0].thumbUrl}
                      alt=""
                      width={44}
                      height={44}
                      style={{ objectFit: "contain", borderRadius: 8, background: "#fff" }}
                    />
                  )}
                </td>
                <td>
                  <Link to={`/admin/products/${p.id}`} style={{ fontWeight: 600 }}>{p.name}</Link>
                  <div className="muted" style={{ fontSize: 13 }}>{p.brand?.name}{p.sku ? ` · ${p.sku}` : ""}</div>
                </td>
                <td>{p.category?.name}</td>
                <td>{p.priceFrom ? money(p.priceFrom) : "—"}</td>
                <td>
                  <button
                    className="btn ghost sm"
                    style={{
                      color: p.isActive ? "#10b981" : "#ef4444",
                      borderColor: p.isActive ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)",
                      background: p.isActive ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
                      fontWeight: 600,
                    }}
                    onClick={() => toggle(p)}
                    title={p.isActive ? "Bosib saytdan yashirish" : "Bosib saytda ko'rsatish"}
                  >
                    {p.isActive ? aT("badge_active") : aT("badge_hidden")}
                  </button>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <Link className="btn ghost sm" to={`/admin/products/${p.id}`}>{aT("edit")}</Link>{" "}
                  <button className="btn ghost sm" onClick={() => remove(p)}>{aT("delete")}</button>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 32 }}>
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
// 5 ta asosiy toifaga mos aqlli qoidalar (Category Profile Rules)
// ============================================================================
interface CategoryRule {
  badgeEmoji: string;
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
    badgeEmoji: "🩹",
    badgeTitle: "Tibbiy buyumlar & Sarflov materiallari (Shprits, bint, qo'lqop, kateterlar)",
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
    packageQtyLabel: "1 qutidagi / pachkadagi dona soni (donalab hisoblash uchun)",
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
    badgeEmoji: "🔬",
    badgeTitle: "Tibbiy apparaturalar (UZI, IVL, Rentgen, Defibrillyator, Monitorlar)",
    defaultUnit: "dona",
    allowedUnits: [
      { value: "dona", label: "dona (1 apparat)" },
      { value: "komplekt", label: "komplekt (tizim / stansiya)" },
    ],
    showPackageQty: false, // Pachka bo'lmaydi!
    showDates: false,      // Yaroqlilik muddati emas, kafolat beriladi!
    warrantyRecommended: true,
    quickSpecs: ["Ekran", "Quvvat sarfi", "Datchiklar", "Ishlash rejimlari", "Kanallar soni", "Akkumulyator"],
    specPlaceholders: {
      "Ekran": "Masalan: 15.6 dyuymli HD sensorli displey",
      "Quvvat sarfi": "Masalan: 220V, 50Hz, 150W",
      "Datchiklar": "Konveks, chiziqli, kardiologik fazali datchiklar",
      "Ishlash rejimlari": "B, M, Color Doppler, Power Doppler, PW",
      "Kanallar soni": "Masalan: 12 kanalli sinxron yozuv",
      "Akkumulyator": "Kamida 3 soat uzluksiz avtonom ishlash",
    },
  },
  "tibbiy-jihozlar": {
    badgeEmoji: "🛏️",
    badgeTitle: "Tibbiy jihozlar & Mebel (Jarrohlik stollari, funksional karavotlar, sterilizatorlar)",
    defaultUnit: "dona",
    allowedUnits: [
      { value: "dona", label: "dona (1 jihoz)" },
      { value: "komplekt", label: "komplekt (to'plam)" },
    ],
    showPackageQty: false, // Pachka bo'lmaydi!
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
    badgeEmoji: "🧪",
    badgeTitle: "Laboratoriya reagentlari & Test to'plamlari (Biokimyoviy, Gematologik testlar)",
    defaultUnit: "flakon",
    allowedUnits: [
      { value: "flakon", label: "flakon / ampula" },
      { value: "to'plam", label: "to'plam (test kiti)" },
      { value: "litr", label: "litr" },
      { value: "quti", label: "quti" },
      { value: "dona", label: "dona" },
    ],
    showPackageQty: true,
    packageQtyLabel: "1 to'plamdagi / qutidagi testlar yoki flakonlar soni",
    showDates: true,
    warrantyRecommended: false,
    quickSpecs: ["Saqlash harorati", "Testlar soni", "Turi (shakli)", "Reaksiya vaqti"],
    specPlaceholders: {
      "Saqlash harorati": "Masalan: +2°C ... +8°C muzlatgichda",
      "Testlar soni": "Masalan: 100 ta test uchun to'plam",
      "Turi (shakli)": "Liofilizatsiyalangan kukun / Suyuq reagent",
      "Reaksiya vaqti": "10-15 daqiqa inkubatsiya",
    },
  },
  "ortopedik-mahsulotlar": {
    badgeEmoji: "♿",
    badgeTitle: "Ortopedik mahsulotlar & Aravachalar (Pultli aravachalar, bandajlar, korsetlar)",
    defaultUnit: "dona",
    allowedUnits: [
      { value: "dona", label: "dona (1 ta)" },
      { value: "juft", label: "juft (qo'ltiqtayoq / xassa)" },
      { value: "komplekt", label: "komplekt" },
    ],
    showPackageQty: false, // Pachka bo'lmaydi!
    showDates: false,
    warrantyRecommended: true,
    quickSpecs: ["O'lchami", "Maksimal yuklama", "Akkumulyator", "Og'irligi", "Fiksatsiya darajasi"],
    specPlaceholders: {
      "O'lchami": "Masalan: S, M, L, XL yoki Universal",
      "Maksimal yuklama": "Masalan: 120 kg gacha",
      "Akkumulyator": "24V 12Ah litiy batareya (20 km masofa)",
      "Og'irligi": "Masalan: 14 kg (yengil alyuminiy qotishma)",
      "Fiksatsiya darajasi": "Qattiq / Yarim qattiq",
    },
  },
};

const DEFAULT_CATEGORY_RULE: CategoryRule = {
  badgeEmoji: "🏥",
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

const empty = {
  name: "", sku: "", description: "", country: "", priceFrom: "" as string | number,
  oldPrice: "" as string | number, discountPercent: "" as string | number,
  unit: "dona", packageQty: 1 as string | number,
  mfdDate: "", expDate: "",
  isHit: false, isNew: false, isActive: true, categoryId: "" as string | number, brandId: "" as string | number,
  specs: [] as { name: string; value: string }[],
};

export function ProductForm() {
  const { aT, lang } = useAdminI18n();
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = !id || id === "new";
  const [f, setF] = useState(empty);
  const [warranty, setWarranty] = useState("");
  const [cats, setCats] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [images, setImages] = useState<Product["images"]>([]);
  const [newFiles, setNewFiles] = useState<{ file: File; preview: string }[]>([]);
  const [docs, setDocs] = useState<NonNullable<Product["documents"]>>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Category[]>("/admin/categories", { admin: true }).then(setCats);
    api<Brand[]>("/admin/brands", { admin: true }).then(setBrands);
  }, []);

  useEffect(() => {
    if (isNew) { setF(empty); setWarranty(""); setImages([]); setDocs([]); return; }
    api<Product>(`/admin/products/${id}`, { admin: true }).then((p) => {
      setF({
        name: p.name, sku: p.sku || "", description: p.description, country: p.country || "",
        priceFrom: p.priceFrom ? Number(p.priceFrom) : "",
        oldPrice: p.oldPrice ? Number(p.oldPrice) : "",
        discountPercent: p.discountPercent ?? "",
        unit: p.unit || "dona",
        packageQty: p.packageQty || 1,
        mfdDate: p.mfdDate || "",
        expDate: p.expDate || "",
        isHit: p.isHit, isNew: p.isNew, isActive: p.isActive,
        categoryId: p.categoryId, brandId: p.brandId || "", specs: p.specs || [],
      });
      const warSpec = p.specs?.find((s) => s.name === "Kafolat")?.value || "";
      setWarranty(warSpec);
      setImages(p.images);
      setDocs(p.documents || []);
    }).catch((e) => setError(e.message));
  }, [id, isNew]);

  const set = (k: keyof typeof empty, v: any) => setF((s) => ({ ...s, [k]: v }));

  // Tanlangan toifaga mos qoidani aniqlash
  const selectedCat = cats.find((c) => String(c.id) === String(f.categoryId));
  const catSlug = selectedCat?.slug || "";
  const catRule = CATEGORY_RULES[catSlug] || DEFAULT_CATEGORY_RULE;

  // Kategoriya tanlanganda mos o'lchov birligini avtomatik sozlash
  const handleCategoryChange = (catId: string) => {
    const chosenCat = cats.find((c) => String(c.id) === catId);
    const rule = chosenCat ? (CATEGORY_RULES[chosenCat.slug] || DEFAULT_CATEGORY_RULE) : DEFAULT_CATEGORY_RULE;

    setF((prev) => {
      const isCurrentUnitAllowed = rule.allowedUnits.some((u) => u.value === prev.unit);
      const nextUnit = isCurrentUnitAllowed ? prev.unit : rule.defaultUnit;
      const nextPackageQty = rule.showPackageQty ? (prev.packageQty || 1) : 1;
      return {
        ...prev,
        categoryId: catId,
        unit: nextUnit,
        packageQty: nextPackageQty,
      };
    });
  };

  // Tezkor xususiyat qo'shish tugmasi bosilganda
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
    setBusy(true); setError(""); setMsg("");

    const otherSpecs = f.specs.filter((s) => s.name.trim() && s.value.trim() && s.name !== "Kafolat");
    if (warranty.trim()) {
      otherSpecs.unshift({ name: "Kafolat", value: warranty.trim() });
    }

    const body = {
      ...f,
      priceFrom: f.priceFrom === "" ? null : Number(f.priceFrom),
      oldPrice: f.oldPrice === "" ? null : Number(f.oldPrice),
      discountPercent: f.discountPercent === "" ? null : Number(f.discountPercent),
      packageQty: catRule.showPackageQty ? (f.packageQty === "" ? 1 : Number(f.packageQty)) : 1,
      unit: f.unit || catRule.defaultUnit,
      mfdDate: catRule.showDates ? (f.mfdDate || null) : null,
      expDate: catRule.showDates ? (f.expDate || null) : null,
      brandId: f.brandId === "" ? null : Number(f.brandId),
      categoryId: Number(f.categoryId),
      specs: otherSpecs,
    };
    try {
      if (isNew) {
        const p = await api<Product>("/admin/products", { json: body, admin: true });
        if (newFiles.length > 0) {
          const fd = new FormData();
          newFiles.forEach((x) => fd.append("files", x.file));
          await api(`/admin/products/${p.id}/images`, { form: fd, admin: true });
        }
        nav("/admin/products");
      } else {
        await api(`/admin/products/${id}`, { method: "PUT", json: body, admin: true });
        setMsg("Saqlandi.");
      }
    } catch (err) { setError((err as ApiError).message); }
    finally { setBusy(false); }
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
    } catch (err) { setError((err as ApiError).message); }
    e.target.value = "";
  };

  const uploadDoc = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", file.name.replace(/\.pdf$/i, ""));
    try {
      const d = await api<NonNullable<Product["documents"]>[number]>(`/admin/products/${id}/documents`, { form: fd, admin: true });
      setDocs((cur) => [...cur, d]);
    } catch (err) { setError((err as ApiError).message); }
    e.target.value = "";
  };

  return (
    <>
      <h1>
        {isNew
          ? (lang === "ru" ? "Новый товар" : lang === "en" ? "New Product" : "Yangi mahsulot")
          : (lang === "ru" ? "Редактирование товара" : lang === "en" ? "Edit Product" : "Mahsulotni tahrirlash")}
      </h1>
      {error && <p className="err" role="alert">{error}</p>}
      {msg && <p className="ok">{msg}</p>}

      {/* Tanlangan toifa haqida aqlli eslatma */}
      {selectedCat && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            background: "rgba(2, 132, 199, 0.08)",
            borderRadius: 10,
            border: "1px solid rgba(2, 132, 199, 0.25)",
            marginBottom: 16,
            maxWidth: 860,
          }}
        >
          <span style={{ fontSize: 22 }}>{catRule.badgeEmoji}</span>
          <div>
            <strong style={{ color: "#0284c7", fontSize: 13.5 }}>{catRule.badgeTitle}</strong>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink2, #64748b)" }}>
              {catRule.showPackageQty
                ? "Sarflov yoki reagent uchun qadoqdagi dona soni va yaroqlilik muddatlari faollashtirildi."
                : "Apparatura / jihoz uchun qadoq (pachka) yashirildi, kafolat va texnik parametrlar tavsiya etildi."}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={save} style={{ maxWidth: 860 }}>
        <div className="formgrid">
          <div className="field full">
            <label htmlFor="name">Nomi *</label>
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

          <div className="field">
            <label htmlFor="co">Ishlab chiqarilgan davlat</label>
            <input
              id="co"
              type="text"
              placeholder="Masalan: Germaniya, Xitoy, Yaponiya"
              value={f.country}
              onChange={(e) => set("country", e.target.value)}
            />
          </div>

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

          {/* Narx va Skidka bloki */}
          <div className="field">
            <label htmlFor="pr">Sotuv narxi (UZS) *</label>
            <input
              id="pr"
              type="number"
              min={0}
              placeholder="Hozirgi amaldagi narx"
              value={f.priceFrom}
              onChange={(e) => set("priceFrom", e.target.value)}
            />
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
              placeholder="Masalan: 120 000 (agar chegirma bo'lsa)"
              value={f.oldPrice}
              onChange={(e) => set("oldPrice", e.target.value)}
            />
          </div>

          {/* O'lchov birligi (Tanlangan toifaga mos keladigan birliklar) */}
          <div className="field">
            <label htmlFor="unit">
              O'lchov birligi
              <span style={{ fontSize: 11, color: "#0284c7", marginLeft: 6 }}>({catRule.badgeEmoji} toifaga mos)</span>
            </label>
            <select id="unit" value={f.unit} onChange={(e) => set("unit", e.target.value)}>
              {catRule.allowedUnits.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>

          {/* Qutidagi / Blokdagi dona soni (Faqat sarflov materiallari va reagentlar uchun chiqadi) */}
          {catRule.showPackageQty ? (
            <div className="field">
              <label htmlFor="pkg">
                {catRule.packageQtyLabel || "Qutidagi dona soni"}
                <span style={{ fontSize: 11, color: "var(--ink2)", marginLeft: 6 }}>(donalab hisoblash uchun)</span>
              </label>
              <input
                id="pkg"
                type="number"
                min={1}
                placeholder="1 qutida masalan: 50 yoki 100 dona"
                value={f.packageQty}
                onChange={(e) => set("packageQty", e.target.value)}
              />
            </div>
          ) : (
            <div className="field" style={{ display: "none" }}>
              <input type="hidden" value="1" />
            </div>
          )}

          {/* Ishlab chiqarilgan sana va Yaroqlilik muddati (Faqat sarflov va reagentlar uchun) */}
          {catRule.showDates && (
            <>
              <div className="field">
                <label htmlFor="mfddate">Ishlab chiqarilgan sana (Mfd)</label>
                <input
                  id="mfddate"
                  type="text"
                  placeholder="Masalan: 2024-05 yoki 05.2024"
                  value={f.mfdDate}
                  onChange={(e) => set("mfdDate", e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="expdate">Yaroqlilik muddati (Exp / Best before)</label>
                <input
                  id="expdate"
                  type="text"
                  placeholder="Masalan: 2027-05 yoki 3 yil"
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
                <span style={{ fontSize: 11, color: "#10b981", marginLeft: 6 }}>(Tavsiya etiladi)</span>
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
            <label style={{ cursor: "pointer", fontWeight: 700, color: f.isActive ? "#10b981" : "#ef4444" }}>
              <input type="checkbox" checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              {f.isActive ? "🟢 Saytda ko'rinsin (Faol)" : "🔴 Saytdan yashirish (Nofaol)"}
            </label>
            <label style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={f.isHit} onChange={(e) => set("isHit", e.target.checked)} />
              🔥 Ommabop (Xit)
            </label>
            <label style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={f.isNew} onChange={(e) => set("isNew", e.target.checked)} />
              ✨ Yangi model
            </label>
          </div>

          <div className="field full">
            <label htmlFor="d">Tavsif va qo'llanish sohasi</label>
            <textarea
              id="d"
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
              style={{ minHeight: 140 }}
              placeholder="Mahsulot haqida to'liq tibbiy ma'lumot, qo'llanish ko'rsatmalari va texnik afzalliklari..."
            />
          </div>
        </div>

        {/* Texnik xususiyatlar bo'limi */}
        <div style={{ marginTop: 20 }}>
          <h3 style={{ margin: "14px 0 6px" }}>Texnik xususiyatlar</h3>

          {/* Toifaga mos tezkor qo'shish tavsiyalari (Smart Chips) */}
          {catRule.quickSpecs.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--ink2)", fontWeight: 600 }}>Tavsiya etilgan:</span>
              {catRule.quickSpecs.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => addQuickSpec(spec)}
                  className="btn ghost sm"
                  style={{
                    fontSize: 11.5,
                    padding: "3px 8px",
                    borderRadius: 14,
                    borderColor: "var(--line)",
                    background: "var(--card)",
                  }}
                >
                  + {spec}
                </button>
              ))}
            </div>
          )}

          {f.specs.map((s, i) => (
            <div className="specrow" key={i}>
              <input
                type="text"
                placeholder="Xususiyat nomi (masalan, Ekran, Sterillik)"
                value={s.name}
                onChange={(e) => set("specs", f.specs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                aria-label="Xususiyat nomi"
              />
              <input
                type="text"
                placeholder={catRule.specPlaceholders[s.name] || "Qiymati (masalan, 15 dyuym, Steril)"}
                value={s.value}
                onChange={(e) => set("specs", f.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                aria-label="Xususiyat qiymati"
              />
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => set("specs", f.specs.filter((_, j) => j !== i))}
              >
                O'chirish
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => set("specs", [...f.specs, { name: "", value: "" }])}
          >
            + Boshqa xususiyat qo'shish
          </button>
        </div>

        {/* Rasmlar bo'limi */}
        <div style={{ maxWidth: 860, marginTop: 26, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>Mahsulot rasmlari</h3>
          <p className="note" style={{ margin: "0 0 12px", color: "var(--ink2)" }}>
            Rasmlarni tanlang — "Saqlash" bosilganda barchasi avtomatik yuklanadi va WebP ga o'tkaziladi.
          </p>

          <div className="imgs" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            {newFiles.map((nf, i) => (
              <div
                className="it"
                key={`new-${i}`}
                style={{
                  position: "relative",
                  width: 90,
                  height: 90,
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "2px solid var(--teal, #0d9488)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <img src={nf.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button
                  type="button"
                  aria-label="O'chirish"
                  onClick={() => removeNewFile(i)}
                  style={{
                    position: "absolute",
                    top: 3,
                    right: 3,
                    background: "rgba(0,0,0,0.65)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: 22,
                    height: 22,
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}

            {images.map((im) => (
              <div className="it" key={im.id}>
                <img src={im.thumbUrl} alt="" />
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
              gap: 8,
              padding: "8px 14px",
              fontWeight: 600,
            }}
          >
            📷 {isNew || newFiles.length > 0 ? "Rasmlarni tanlash (bir nechta)" : "+ Rasm yuklash"}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={isNew ? onPickNewFiles : upload}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {!isNew && (
          <div style={{ maxWidth: 860, marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 16 }}>Hujjatlar (PDF)</h3>
            <div className="docs" style={{ margin: "10px 0" }}>
              {docs.map((d) => (
                <span key={d.id}>
                  <a href={d.url} target="_blank" rel="noopener">PDF · {d.title}</a>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={async () => {
                      await api(`/admin/documents/${d.id}`, { method: "DELETE", admin: true });
                      setDocs((c) => c.filter((x) => x.id !== d.id));
                    }}
                  >
                    O'chirish
                  </button>{" "}
                </span>
              ))}
            </div>
            <input type="file" accept="application/pdf" onChange={uploadDoc} aria-label="PDF yuklash" />
          </div>
        )}

        <div className="row" style={{ marginTop: 26 }}>
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
