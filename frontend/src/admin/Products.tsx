import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError, Brand, Category, Paged, Product, money } from "../api";
import { Pager } from "../components/Shell";
import { useAdminI18n } from "./i18n";

export function ProductList() {
  const { aT, t, lang } = useAdminI18n();
  const [data, setData] = useState<Paged<Product> | null>(null);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<Paged<Product>>(`/admin/products?page=${page}&q=${encodeURIComponent(query)}`, { admin: true })
      .then(setData).catch((e) => setError(e.message));
  }, [page, query]);
  useEffect(load, [load]);

  const remove = async (p: Product) => {
    if (!confirm(`"${p.name}" o'chirilsinmi?`)) return;
    try {
      const r = await api<{ hidden?: boolean }>(`/admin/products/${p.id}`, { method: "DELETE", admin: true });
      if (r.hidden) alert("Mahsulot buyurtmalarda ishlatilgan, shuning uchun o'chirilmadi, faqat saytdan yashirildi.");
      load();
    } catch (e) { setError((e as ApiError).message); }
  };

  const toggle = async (p: Product) => {
    const full = await api<Product>(`/admin/products/${p.id}`, { admin: true });
    await api(`/admin/products/${p.id}`, { method: "PUT", admin: true, json: { ...full, isActive: !p.isActive } });
    load();
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
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
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
                <td style={{ width: 56 }}>{p.images[0] && <img src={p.images[0].thumbUrl} alt="" width={44} height={44} style={{ objectFit: "contain", borderRadius: 8, background: "#fff" }} />}</td>
                <td><Link to={`/admin/products/${p.id}`} style={{ fontWeight: 600 }}>{p.name}</Link><div className="muted" style={{ fontSize: 13 }}>{p.brand?.name}{p.sku ? ` · ${p.sku}` : ""}</div></td>
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
                    title={p.isActive ? "Bosib yashirish" : "Bosib saytda ko'rsatish"}
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
            {data && data.items.length === 0 && <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: 32 }}>{aT("not_found")}</td></tr>}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
    </>
  );
}

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
      packageQty: f.packageQty === "" ? 1 : Number(f.packageQty),
      unit: f.unit || "dona",
      mfdDate: f.mfdDate || null,
      expDate: f.expDate || null,
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
      <form onSubmit={save} style={{ maxWidth: 860 }}>
        <div className="formgrid">
          <div className="field full"><label htmlFor="name">Nomi *</label><input id="name" type="text" required value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
          
          <div className="field"><label htmlFor="cat">Kategoriya *</label>
            <select id="cat" required value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">Tanlang</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
          <div className="field"><label htmlFor="br">Brend</label>
            <select id="br" value={f.brandId} onChange={(e) => set("brandId", e.target.value)}>
              <option value="">Brendsiz</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select></div>

          <div className="field"><label htmlFor="co">Ishlab chiqarilgan davlat</label><input id="co" type="text" placeholder="Masalan: Germaniya, Xitoy" value={f.country} onChange={(e) => set("country", e.target.value)} /></div>
          <div className="field"><label htmlFor="sku">Artikul / Model kodi</label><input id="sku" type="text" placeholder="Masalan: MR-N17 yoki MDX-001" value={f.sku} onChange={(e) => set("sku", e.target.value)} /></div>

          {/* Narx va Skidka bloki */}
          <div className="field">
            <label htmlFor="pr">Sotuv narxi (UZS) *</label>
            <input id="pr" type="number" min={0} placeholder="Hozirgi amaldagi narx" value={f.priceFrom} onChange={(e) => set("priceFrom", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="oldpr">
              Asl narx / Eski narx (UZS)
              <span style={{ fontSize: 11, color: "var(--ink2)", marginLeft: 6 }}>(Aksiya uchun)</span>
            </label>
            <input id="oldpr" type="number" min={0} placeholder="Masalan: 120 000 (agar skidka bo'lsa)" value={f.oldPrice} onChange={(e) => set("oldPrice", e.target.value)} />
          </div>

          {/* O'lchov birligi va Pachkadagi dona soni (Maska, perchatkalar uchun) */}
          <div className="field">
            <label htmlFor="unit">{aT("unit")}</label>
            <select id="unit" value={f.unit} onChange={(e) => set("unit", e.target.value)}>
              <option value="dona">{aT("unit_dona")}</option>
              <option value="quti">{aT("unit_quti")}</option>
              <option value="pachka">{aT("unit_pachka")}</option>
              <option value="o'ram">{aT("unit_oram")}</option>
              <option value="komplekt">{aT("unit_komplekt")}</option>
              <option value="juft">{aT("unit_juft")}</option>
              <option value="flakon">{aT("unit_flakon")}</option>
              <option value="metr">{aT("unit_metr")}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="pkg">
              Qutidagi / Blokdagi dona soni
              <span style={{ fontSize: 11, color: "var(--ink2)", marginLeft: 6 }}>(donalab hisoblash uchun)</span>
            </label>
            <input id="pkg" type="number" min={1} placeholder="1 qutida masalan: 50 yoki 100 dona" value={f.packageQty} onChange={(e) => set("packageQty", e.target.value)} />
          </div>

          {/* Ishlab chiqarilgan sana va Yaroqlilik muddati */}
          <div className="field">
            <label htmlFor="mfddate">Ishlab chiqarilgan sana (Mfd)</label>
            <input id="mfddate" type="text" placeholder="Masalan: 2024-05 yoki 05.2024" value={f.mfdDate} onChange={(e) => set("mfdDate", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="expdate">Yaroqlilik muddati (Exp / Best before)</label>
            <input id="expdate" type="text" placeholder="Masalan: 2027-05 yoki 3 yil" value={f.expDate} onChange={(e) => set("expDate", e.target.value)} />
          </div>

          <div className="field"><label htmlFor="war">Kafolat muddati (kun yoki oy)</label><input id="war" type="text" placeholder="Masalan: 365 kun yoki 12 oy" value={warranty} onChange={(e) => setWarranty(e.target.value)} /></div>

          <div className="check" style={{ alignSelf: "end", display: "flex", gap: 14, flexWrap: "wrap", paddingBottom: 6 }}>
            <label style={{ cursor: "pointer", fontWeight: 700, color: f.isActive ? "#10b981" : "#ef4444" }}>
              <input type="checkbox" checked={f.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              {f.isActive ? "🟢 Saytda ko'rinsin (Faol)" : "🔴 Yashirin"}
            </label>
            <label style={{ cursor: "pointer" }}><input type="checkbox" checked={f.isHit} onChange={(e) => set("isHit", e.target.checked)} />🔥 Ommabop (Xit)</label>
            <label style={{ cursor: "pointer" }}><input type="checkbox" checked={f.isNew} onChange={(e) => set("isNew", e.target.checked)} />✨ Yangi model</label>
          </div>

          <div className="field full"><label htmlFor="d">Tavsif va qo'llanish sohasi</label><textarea id="d" value={f.description} onChange={(e) => set("description", e.target.value)} style={{ minHeight: 140 }} placeholder="Mahsulot haqida to'liq tibbiy ma'lumot va afzalliklari..." /></div>
        </div>

        <h3 style={{ margin: "14px 0 10px" }}>Texnik xususiyatlar</h3>
        {f.specs.map((s, i) => (
          <div className="specrow" key={i}>
            <input type="text" placeholder="Nomi (masalan, Sterillik, O'lchami)" value={s.name} onChange={(e) => set("specs", f.specs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label="Xususiyat nomi" />
            <input type="text" placeholder="Qiymati (masalan, Steril, L o'lcham)" value={s.value} onChange={(e) => set("specs", f.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} aria-label="Xususiyat qiymati" />
            <button type="button" className="btn ghost sm" onClick={() => set("specs", f.specs.filter((_, j) => j !== i))}>O'chirish</button>
          </div>
        ))}
        <button type="button" className="btn ghost sm" onClick={() => set("specs", [...f.specs, { name: "", value: "" }])}>+ Xususiyat qo'shish</button>

        {/* Rasmlar bo'limi - mahsulot yaratishda ham, tahrirlashda ham to'g'ridan-to'g'ri ishlaydi */}
        <div style={{ maxWidth: 860, marginTop: 26, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>Mahsulot rasmlari</h3>
          <p className="note" style={{ margin: "0 0 12px", color: "var(--ink2)" }}>
            Rasmlarni hoziroq tanlang — "Saqlash" bosilganda barchasi birgalikda avtomatik yuklanadi va WebP ga o'tkaziladi.
          </p>

          <div className="imgs" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            {/* Yangi tanlangan rasmlar (preview) */}
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

            {/* Avvaldan saqlangan rasmlar */}
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
