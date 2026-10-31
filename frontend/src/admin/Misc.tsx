import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ApiError, getToken } from "../api";
import { useAdminI18n } from "./i18n";

/* ------------------------------ Blocklist ------------------------------ */

interface Blocked { id: number; type: "PHONE" | "IP"; value: string; reason: string; createdAt: string }

export function Blocklist() {
  const [rows, setRows] = useState<Blocked[]>([]);
  const [type, setType] = useState<"PHONE" | "IP">("PHONE");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => { api<Blocked[]>("/admin/blocklist", { admin: true }).then(setRows).catch((e) => setError(e.message)); }, []);
  useEffect(load, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault(); setError("");
    try { await api("/admin/blocklist", { json: { type, value, reason }, admin: true }); setValue(""); setReason(""); load(); }
    catch (err) { setError((err as ApiError).message); }
  };

  return (
    <>
      <h1>Bloklanganlar</h1>
      <p className="muted" style={{ maxWidth: "62ch" }}>
        Bu ro'yxatdagi telefon raqam yoki IP manzildan SMS kod ham, buyurtma ham qabul qilinmaydi. Soxta deb belgilangan raqamlar limitga yetganda shu yerga avtomatik tushadi.
      </p>
      {error && <p className="err">{error}</p>}
      <form className="row" onSubmit={add}>
        <select style={{ width: 120 }} value={type} onChange={(e) => setType(e.target.value as any)} aria-label="Turi"><option value="PHONE">Telefon</option><option value="IP">IP</option></select>
        <input type="text" style={{ flex: 1, minWidth: 180 }} placeholder={type === "PHONE" ? "+998 90 123 45 67" : "IP manzil"} value={value} onChange={(e) => setValue(e.target.value)} required aria-label="Qiymat" />
        <input type="text" style={{ flex: 1, minWidth: 180 }} placeholder="Sabab (ixtiyoriy)" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Sabab" />
        <button className="btn">Bloklash</button>
      </form>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Turi</th><th>Qiymat</th><th>Sabab</th><th>Sana</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.type === "PHONE" ? "Telefon" : "IP"}</td><td style={{ fontWeight: 600 }}>{r.value}</td><td>{r.reason || "—"}</td>
                <td>{new Date(r.createdAt).toLocaleDateString("ru-RU")}</td>
                <td><button className="btn ghost sm" onClick={async () => { await api(`/admin/blocklist/${r.id}`, { method: "DELETE", admin: true }); load(); }}>Blokdan chiqarish</button></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 32 }}>Ro'yxat bo'sh.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* -------------------------------- Import ------------------------------- */

export function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [res, setRes] = useState<any>(null);

  const downloadTemplate = async () => {
    const r = await fetch("/api/admin/products/import/template", { headers: { Authorization: `Bearer ${getToken()}` } });
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a");
    a.href = url; a.download = "mahsulotlar-shablon.xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setError(""); setRes(null);
    const fd = new FormData();
    fd.append("file", file);
    try { setRes(await api("/admin/products/import", { form: fd, admin: true })); }
    catch (err) { setError((err as ApiError).message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <h1>Excel orqali yuklash</h1>
      <p className="muted" style={{ maxWidth: "62ch" }}>
        Yuzlab mahsulotni bir marta kiriting. Ustunlar: Nomi, Kategoriya, Brend, Davlat, Narx, Artikul, Tavsif. Yo'q kategoriya va brendlar avtomatik yaratiladi.
        Artikuli mavjud mahsulot yangilanadi, qolganlari yangi qo'shiladi. Rasmlarni keyin har bir mahsulotga alohida yuklaysiz.
      </p>
      <div className="row"><button className="btn ghost" onClick={downloadTemplate}>Shablonni yuklab olish</button></div>
      <form onSubmit={submit} className="row">
        <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} aria-label="Excel fayl" />
        <button className="btn" disabled={!file || busy}>{busy ? "Yuklanmoqda…" : "Yuklash"}</button>
      </form>
      {error && <p className="err">{error}</p>}
      {res && (
        <div className="ok">
          Yangi: <b>{res.created}</b>, yangilangan: <b>{res.updated}</b>, o'tkazib yuborilgan: <b>{res.skipped}</b>, xato: <b>{res.errorCount}</b>
          {res.errors.length > 0 && <ul>{res.errors.map((e: any) => <li key={e.row}>{e.row}-qator: {e.message}</li>)}</ul>}
        </div>
      )}
    </>
  );
}

/* --------------------------------- Users ------------------------------- */

interface U { id: number; email: string; name: string; role: "OWNER" | "ADMIN" | "MANAGER" }

export function Users() {
  const [rows, setRows] = useState<U[]>([]);
  const [f, setF] = useState({ email: "", name: "", password: "", role: "MANAGER" });
  const [error, setError] = useState("");
  const load = useCallback(() => { api<U[]>("/admin/users", { admin: true }).then(setRows).catch((e) => setError(e.message)); }, []);
  useEffect(load, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault(); setError("");
    try { await api("/admin/users", { json: f, admin: true }); setF({ email: "", name: "", password: "", role: "MANAGER" }); load(); }
    catch (err) { setError((err as ApiError).message); }
  };

  return (
    <>
      <h1>Xodimlar va Ega</h1>
      <p className="muted" style={{ margin: "-8px 0 16px" }}>
        Loyiha Egasi (Owner) barcha adminlar va menejerlarni boshqaradi.
      </p>
      {error && <p className="err">{error}</p>}
      <form className="row" onSubmit={add}>
        <input type="text" placeholder="Ism" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required aria-label="Ism" />
        <input type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required aria-label="Email" />
        <input type="password" placeholder="Parol (8+ belgi)" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={8} aria-label="Parol" autoComplete="new-password" />
        <select style={{ width: 160 }} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as any })} aria-label="Rol">
          <option value="MANAGER">Menejer</option>
          <option value="ADMIN">Administrator</option>
          <option value="OWNER">👑 Ega (Owner)</option>
        </select>
        <button className="btn">Qo'shish</button>
      </form>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th>Ism</th><th>Email</th><th>Rol</th><th></th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>
                  {u.name} {u.role === "OWNER" && "👑"}
                </td>
                <td>{u.email}</td>
                <td>
                  <span style={{
                    padding: "3px 10px",
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 12.5,
                    background: u.role === "OWNER" ? "#fef3c7" : u.role === "ADMIN" ? "#e0f2fe" : "#f1f5f9",
                    color: u.role === "OWNER" ? "#b45309" : u.role === "ADMIN" ? "#0284c7" : "#475569",
                  }}>
                    {u.role === "OWNER" ? "👑 Ega (Owner)" : u.role === "ADMIN" ? "Administrator" : "Menejer"}
                  </span>
                </td>
                <td>
                  {u.role !== "OWNER" ? (
                    <button className="btn ghost sm" onClick={async () => {
                      if (!confirm("Ushbu xodim o'chirilsinmi?")) return;
                      try { await api(`/admin/users/${u.id}`, { method: "DELETE", admin: true }); load(); }
                      catch (e) { setError((e as ApiError).message); }
                    }}>
                      O'chirish
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--ink2)", fontStyle: "italic" }}>Asosiy Ega</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* --------------------------- Contact Messages -------------------------- */

interface ContactMsg {
  id: number;
  name: string;
  phone: string;
  subject: string;
  message: string;
  isRead: boolean;
  ip?: string;
  createdAt: string;
}

export function ContactMessagesPage() {
  const { lang, t } = useAdminI18n();
  const [rows, setRows] = useState<ContactMsg[]>([]);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page) });
    if (filter === "UNREAD") p.set("isRead", "false");
    if (filter === "READ") p.set("isRead", "true");

    api<{ items: ContactMsg[]; unreadCount: number; pages: number }>(`/admin/contact-messages?${p}`, { admin: true })
      .then((res) => {
        setRows(res.items);
        setTotalPages(res.pages || 1);
      })
      .catch((err) => setError((err as ApiError).message))
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(load, [load]);

  const setFilterMode = (f: "ALL" | "UNREAD" | "READ") => {
    setPage(1);
    setFilter(f);
  };

  const toggleRead = async (id: number, current: boolean) => {
    try {
      await api(`/admin/contact-messages/${id}`, { method: "PATCH", json: { isRead: !current }, admin: true });
      load();
    } catch (err) {
      setError((err as ApiError).message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm(t("confirm_delete_inquiry"))) return;
    try {
      await api(`/admin/contact-messages/${id}`, { method: "DELETE", admin: true });
      load();
    } catch (err) {
      setError((err as ApiError).message);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px" }}>{t("inquiries_title")}</h1>
          <p className="muted" style={{ margin: 0 }}>{t("inquiries_sub")}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className={`btn ${filter === "ALL" ? "" : "ghost"} sm`} onClick={() => setFilterMode("ALL")}>{t("filter_all")}</button>
          <button className={`btn ${filter === "UNREAD" ? "" : "ghost"} sm`} onClick={() => setFilterMode("UNREAD")}>{t("filter_unread")}</button>
          <button className={`btn ${filter === "READ" ? "" : "ghost"} sm`} onClick={() => setFilterMode("READ")}>{t("filter_read")}</button>
        </div>
      </div>

      {error && <p className="err">{error}</p>}

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("col_status")}</th>
              <th>{t("col_customer")}</th>
              <th>{t("col_phone")}</th>
              <th>{t("col_subject_msg")}</th>
              <th>{t("col_date")}</th>
              <th>{t("col_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} style={!m.isRead ? { background: "var(--sea, rgba(2, 132, 199, 0.05))" } : undefined}>
                <td>
                  <span className={`st ${!m.isRead ? "NEW" : "DONE"}`}>
                    {!m.isRead ? t("st_unread") : t("st_read")}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{m.name}</td>
                <td>
                  <a href={`tel:${m.phone.replace(/\s+/g, "")}`} style={{ color: "inherit", fontWeight: 500 }}>
                    {m.phone}
                  </a>
                </td>
                <td style={{ maxWidth: 360 }}>
                  {m.subject && <strong style={{ display: "block", marginBottom: 2 }}>{m.subject}</strong>}
                  <span style={{ fontSize: 13, color: "inherit", whiteSpace: "pre-wrap" }}>{m.message}</span>
                </td>
                <td style={{ fontSize: 13 }}>
                  {new Date(m.createdAt).toLocaleDateString(
                    lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "uz-UZ",
                    { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn ghost sm" onClick={() => toggleRead(m.id, m.isRead)}>
                      {m.isRead ? t("action_mark_unread") : t("action_mark_read")}
                    </button>
                    <button
                      className="btn ghost sm"
                      style={{ color: "var(--crimson, #ef4444)" }}
                      aria-label="Murojaatni o'chirish"
                      title={t("delete")}
                      onClick={() => remove(m.id)}
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="muted" style={{ textAlign: "center", padding: 32 }}>
                  {t("no_inquiries")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pager" style={{ marginTop: 16 }}>
          <button className="btn ghost sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            {t("prev_page")}
          </button>
          <span className="muted" style={{ padding: "0 12px", fontSize: 14 }}>
            {page} / {totalPages}
          </span>
          <button className="btn ghost sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            {t("next_page")}
          </button>
        </div>
      )}
    </>
  );
}
