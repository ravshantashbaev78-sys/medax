import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError, Paged, STATUS_LABEL } from "../api";
import { Pager } from "../components/Shell";

interface Order {
  id: number;
  code: string;
  customerName: string;
  phone: string;
  organization: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  comment: string;
  status: keyof typeof STATUS_LABEL;
  managerNote: string;
  ip?: string | null;
  flags: string[];
  createdAt: string;
  totalAmount?: number | string | null;
  isPaid?: boolean;
  paidAt?: string | null;
  items: {
    id: number;
    productName: string;
    quantity: number;
    price?: number | string | null;
    productId?: number | null;
    product?: {
      id: number;
      sku?: string | null;
      slug?: string | null;
      priceFrom?: number | string | null;
      isActive?: boolean;
      stock?: number;
      images?: { thumbUrl: string; url: string }[];
    } | null;
  }[];
}

import { useAdminI18n } from "./i18n";

const FLAG_LABEL: Record<string, string> = {
  FIRST: "Yangi mijoz (1-buyurtma)",
  TRUSTED: "Ishonchli mijoz",
  OTP_VERIFIED: "SMS kod bilan tasdiqlangan",
};
const fmt = (s: string) => new Date(s).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });

export default function Orders() {
  const { lang, t, aT } = useAdminI18n();
  const [sp, setSp] = useSearchParams();
  const status = sp.get("status") || "";
  const [data, setData] = useState<Paged<Order> | null>(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Order | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    const p = new URLSearchParams({ page: String(page) });
    if (status) p.set("status", status);
    if (query) p.set("q", query);
    api<Paged<Order>>(`/admin/orders?${p}`, { admin: true }).then(setData).catch((e) => setError(e.message));
  }, [page, status, query]);
  useEffect(load, [load]);

  const setStatus = (s: string) => {
    setPage(1);
    setSp(s ? { status: s } : {});
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case "NEW": return t("st_new") || "Yangi";
      case "CONFIRMED": return t("st_confirmed") || "Tasdiqlangan";
      case "READY": return "Olib ketishga tayyor";
      case "DONE": return t("st_done") || "Bajarildi";
      case "CANCELED": return t("st_canceled") || "Bekor qilingan";
      case "FAKE": return t("st_fake") || "Soxta";
      default: return s || t("all") || "Barchasi";
    }
  };

  const exportToCsv = () => {
    if (!data?.items?.length) {
      alert(lang === "ru" ? "Нет заказов для экспорта" : "Eksport qilish uchun buyurtmalar mavjud emas");
      return;
    }
    const headers = [
      "Buyurtma kodi",
      "Mijoz ismi",
      "Tashkilot",
      "Telefon",
      "Manzil",
      "To'lov usuli",
      "To'langan",
      "Jami summa (so'm)",
      "Holati",
      "Sana",
      "Izoh",
      "Mahsulotlar",
    ];

    const rows = data.items.map((o) => {
      const itemsList = o.items.map((i) => `${i.productName} (${i.quantity} dona)`).join("; ");
      return [
        `"${o.code}"`,
        `"${(o.customerName || "").replace(/"/g, '""')}"`,
        `"${(o.organization || "").replace(/"/g, '""')}"`,
        `"${o.phone}"`,
        `"${(o.deliveryAddress || "").replace(/"/g, '""')}"`,
        `"${(o.paymentMethod || "").replace(/"/g, '""')}"`,
        o.isPaid ? "Ha" : "Yo'q",
        o.totalAmount ? Number(o.totalAmount) : 0,
        `"${getStatusLabel(o.status)}"`,
        `"${fmt(o.createdAt)}"`,
        `"${(o.comment || "").replace(/"/g, '""')}"`,
        `"${itemsList.replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medax_buyurtmalar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <h1>{t("orders")}</h1>
      <div className="row">
        {["", "NEW", "CONFIRMED", "READY", "DONE", "CANCELED", "FAKE"].map((s) => (
          <button key={s} className="tab" style={{ margin: 0 }} role="tab" aria-selected={status === s} onClick={() => setStatus(s)}>
            {getStatusLabel(s)}
          </button>
        ))}
        <span className="grow" />
        <button
          type="button"
          className="btn sm ghost"
          onClick={exportToCsv}
          style={{ display: "flex", alignItems: "center", gap: 6, height: 38 }}
          title="Buyurtmalar ro'yxatini Excel (.csv) formatida yuklab olish"
        >
          <span>📥</span>
          <span>{lang === "ru" ? "Экспорт в Excel" : "Excel (CSV)"}</span>
        </button>
        <form className="search" onSubmit={(e: FormEvent) => { e.preventDefault(); setPage(1); setQuery(q.trim()); }}>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kod, ism yoki telefon" aria-label="Qidirish" />
          <button className="btn sm">Qidirish</button>
        </form>
      </div>
      {error && <p className="err">{error}</p>}
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("order_code")}</th>
              <th>{t("customer")}</th>
              <th>{t("phone")}</th>
              <th>Mahsulotlar</th>
              <th>Jami summa</th>
              <th>To'lov</th>
              <th>{t("date")}</th>
              <th>{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((o) => (
              <tr key={o.id} className="click" onClick={() => setOpen(o)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setOpen(o)}>
                <td style={{ fontWeight: 600 }}>#{o.code}</td>
                <td>{o.customerName}{o.organization && <div className="muted" style={{ fontSize: 13 }}>{o.organization}</div>}</td>
                <td>{o.phone}</td>
                <td>{o.items.length} {lang === "ru" ? "поз." : lang === "en" ? "items" : "ta"} ({o.items.reduce((s, i) => s + i.quantity, 0)} {lang === "ru" ? "шт" : lang === "en" ? "pcs" : "dona"})</td>
                <td style={{ fontWeight: 600 }}>
                  {o.totalAmount && Number(o.totalAmount) > 0 ? Number(o.totalAmount).toLocaleString() + " so'm" : <span className="muted">Kelishuv</span>}
                </td>
                <td>
                  {o.isPaid ? (
                    <span style={{ color: "var(--moss, #065f46)", fontWeight: 700, fontSize: 12, background: "var(--mint, #ecfdf5)", padding: "3px 8px", borderRadius: 6 }}>
                      To'langan
                    </span>
                  ) : (
                    <span style={{ color: "#854d0e", fontWeight: 600, fontSize: 12, background: "#fef9c3", padding: "3px 8px", borderRadius: 6 }}>
                      Kutilmoqda
                    </span>
                  )}
                </td>
                <td>{fmt(o.createdAt)}</td>
                <td><span className={`st ${o.status}`}>{getStatusLabel(o.status)}</span></td>
              </tr>
            ))}
            {data && data.items.length === 0 && <tr><td colSpan={8} className="muted" style={{ textAlign: "center", padding: 32 }}>{t("no_orders_yet")}</td></tr>}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
      {open && <Detail order={open} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); load(); }} />}
    </>
  );
}


function Detail({ order, onClose, onChanged }: { order: Order; onClose: () => void; onChanged: () => void }) {
  const { lang, t, aT } = useAdminI18n();
  const [note, setNote] = useState(order.managerNote);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelReasonPreset, setCancelReasonPreset] = useState("Mijoz rad etdi / O'zi bekor qildi");
  const [cancelReasonText, setCancelReasonText] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const patch = async (body: { status?: string; managerNote?: string; isPaid?: boolean }) => {
    setBusy(true); setError("");
    try {
      const r = await api<{ blocked: boolean }>(`/admin/orders/${order.id}`, { method: "PATCH", json: body, admin: true });
      if (r.blocked) {
        setInfo(`${order.phone} raqami soxta buyurtmalar sababli avtomatik bloklandi.`);
      }
      onChanged();
    } catch (e) { setError((e as ApiError).message); setBusy(false); }
  };

  const confirmCancel = () => {
    const fullReason = cancelReasonPreset === "Boshqa"
      ? (cancelReasonText.trim() || "Sabab ko'rsatilmadi")
      : `${cancelReasonPreset}${cancelReasonText.trim() ? `. Qo'shimcha: ${cancelReasonText.trim()}` : ""}`;
    patch({ status: "CANCELED", managerNote: fullReason });
    setCanceling(false);
  };

  const markFake = () => {
    setConfirmAction({
      title: "Soxta buyurtma deb belgilash",
      message: "Bu buyurtma soxta deb belgilansinmi? Raqam takror soxta bo'lsa tizim tomonidan avtomatik bloklanadi.",
      danger: true,
      onConfirm: () => {
        setConfirmAction(null);
        patch({ status: "FAKE", managerNote: note });
      },
    });
  };

  const blockNow = () => {
    setConfirmAction({
      title: "Raqamni bloklash",
      message: `${order.phone} raqamini bloklashni tasdiqlaysizmi? Bu raqamdan yangi buyurtmalar qabul qilinmaydi.`,
      danger: true,
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          await api("/admin/blocklist", { json: { type: "PHONE", value: order.phone, reason: `Buyurtma ${order.code}` }, admin: true });
          setInfo("Raqam bloklandi.");
        } catch (e) { setError((e as ApiError).message); }
      },
    });
  };

  const markPaid = () => {
    setConfirmAction({
      title: "To'lovni tasdiqlash",
      message: "Buyurtma kassada to'landi deb belgilansinmi?",
      danger: false,
      onConfirm: () => {
        setConfirmAction(null);
        patch({ isPaid: true, managerNote: note });
      },
    });
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={`Buyurtma ${order.code}`} onClick={onClose}>
      <div className="box" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2 style={{ fontSize: 26 }}>{order.code}</h2>
          <span className={`st ${order.status}`}>{STATUS_LABEL[order.status]}</span>
          <span className="grow" />
          <button className="btn ghost sm" onClick={onClose}>Yopish</button>
        </div>
        {error && <p className="err">{error}</p>}
        {info && <p className="ok">{info}</p>}
        <p style={{ margin: "0 0 4px" }}><b>{order.customerName}</b> · <a href={`tel:${order.phone}`}>{order.phone}</a></p>
        {order.organization && <p className="muted" style={{ margin: "0 0 4px" }}>{order.organization}</p>}
        <p className="muted" style={{ margin: "0 0 12px", fontSize: 14 }}>
          {fmt(order.createdAt)}{order.ip ? ` · IP ${order.ip}` : ""}
        </p>
        <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {order.flags.map((f) => (
            <span
              key={f}
              className={`flag ${f}`}
              style={f === "OTP_VERIFIED" ? { background: "var(--mint, #ecfdf5)", color: "var(--moss, #065f46)" } : undefined}
            >
              {FLAG_LABEL[f] || f}
            </span>
          ))}
        </div>

        {order.status === "CANCELED" && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 14px", margin: "10px 0" }}>
            <strong style={{ color: "#b91c1c", display: "block", fontSize: 13, marginBottom: 4 }}>
              Buyurtma bekor qilingan
            </strong>
            <span style={{ color: "#7f1d1d", fontSize: 14 }}>
              <b>Sababi:</b> {order.managerNote || "Sabab yozilmagan"}
            </span>
          </div>
        )}

        <h4 style={{ margin: "18px 0 8px", fontSize: 15, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
          <span>📦</span>
          <span>{lang === "ru" ? "Заказанные товары:" : "Buyurtma qilingan mahsulotlar:"}</span>
        </h4>
        <div style={{ display: "grid", gap: 8, margin: "8px 0 16px" }}>
          {order.items.map((i) => {
            const img = i.product?.images?.[0]?.thumbUrl || "/logo.png";
            const price = i.price ? Number(i.price) : null;
            const itemTotal = price ? price * i.quantity : null;
            return (
              <div
                key={i.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "var(--card, #fff)",
                  border: "1px solid var(--line, #e2e8f0)",
                }}
              >
                <img
                  src={img}
                  alt={i.productName}
                  style={{
                    width: 48,
                    height: 48,
                    objectFit: "cover",
                    borderRadius: 8,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    flexShrink: 0,
                  }}
                  onError={(e) => { (e.target as any).src = "/logo.png"; }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 14, color: "var(--ink)" }}>{i.productName}</strong>
                    {i.product?.sku && (
                      <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: "#f1f5f9", color: "#475569", fontWeight: 600 }}>
                        Artikul: {i.product.sku}
                      </span>
                    )}
                    {i.product?.isActive !== undefined && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: i.product.isActive ? "#16a34a" : "#dc2626" }}>
                        {i.product.isActive ? "● Omborda bor" : "○ Saytdan yashirilgan"}
                      </span>
                    )}
                    {i.product?.stock !== undefined && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: (i.product?.stock ?? 0) > 0 ? "#0284c7" : "#dc2626",
                          background: (i.product?.stock ?? 0) > 0 ? "#f0f9ff" : "#fef2f2",
                          padding: "1px 6px",
                          borderRadius: 4,
                        }}
                      >
                        Qoldiq: {i.product?.stock} dona
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: 13, color: "var(--ink-muted, #64748b)", flexWrap: "wrap" }}>
                    {price ? (
                      <span>{price.toLocaleString()} so'm × <b>{i.quantity} dona</b></span>
                    ) : (
                      <span>Kelishilgan narxda × <b>{i.quantity} dona</b></span>
                    )}
                    {i.product?.id && (
                      <a
                        href={`/admin/products/${i.product.id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#0284c7", fontSize: 12, textDecoration: "underline" }}
                      >
                        Tahrirlash / Ko'rish ↗
                      </a>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <strong style={{ fontSize: 15, color: "var(--ink)" }}>
                    {itemTotal ? itemTotal.toLocaleString() + " so'm" : "Kelishuv"}
                  </strong>
                </div>
              </div>
            );
          })}
        </div>

        {/* Jami summa va to'lov holati */}
        <div style={{ background: "var(--sea, #f0f9ff)", border: "1px solid rgba(2, 132, 199, 0.25)", borderRadius: 12, padding: "12px 16px", margin: "12px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <strong style={{ display: "block", fontSize: 13, color: "var(--ink-muted, #64748b)" }}>Buyurtma summasi:</strong>
            <span style={{ fontSize: 19, fontWeight: 800, color: "var(--ink, #0f172a)" }}>
              {order.totalAmount && Number(order.totalAmount) > 0 ? Number(order.totalAmount).toLocaleString() + " so'm" : "Kelishuv asosida"}
            </span>
          </div>
          <div>
            <strong style={{ display: "block", fontSize: 13, color: "var(--ink-muted, #64748b)", textAlign: "right" }}>To'lov holati:</strong>
            {order.isPaid ? (
              <span style={{ color: "var(--moss, #065f46)", fontWeight: 800, fontSize: 14, background: "var(--mint, #ecfdf5)", padding: "4px 10px", borderRadius: 8 }}>
                To'langan (Kassada / Hisob raqamda)
              </span>
            ) : (
              <span style={{ color: "#854d0e", fontWeight: 700, fontSize: 14, background: "#fef9c3", padding: "4px 10px", borderRadius: 8 }}>
                To'lov kutilmoqda
              </span>
            )}
          </div>
        </div>

        {order.deliveryAddress && (
          <div style={{ background: "var(--sea, #f0f9ff)", border: "1px solid rgba(2, 132, 199, 0.2)", borderRadius: 10, padding: "10px 14px", margin: "10px 0" }}>
            <strong style={{ display: "block", fontSize: 13, color: "var(--ink-muted, #64748b)", marginBottom: 4 }}>
              Yetkazib berish manzili:
            </strong>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink, #0f172a)" }}>{order.deliveryAddress}</span>
          </div>
        )}

        {order.paymentMethod && (
          <div style={{ background: "var(--sea, #f0f9ff)", border: "1px solid rgba(2, 132, 199, 0.2)", borderRadius: 10, padding: "10px 14px", margin: "10px 0" }}>
            <strong style={{ display: "block", fontSize: 13, color: "var(--ink-muted, #64748b)", marginBottom: 4 }}>
              To'lov usuli:
            </strong>
            <span style={{ fontSize: 15, fontWeight: 600, color: "var(--ink, #0f172a)" }}>
              {order.paymentMethod.includes("Shartnoma") || order.paymentMethod.includes("B2B")
                ? "Shartnoma asosida (B2B / Bank o'tkazmasi)"
                : "Do'konda to'lash (Olib ketish paytida)"}
            </span>
          </div>
        )}

        {order.comment && (
          <div style={{ background: "var(--sea, #f0f9ff)", borderRadius: 10, padding: "10px 14px", margin: "10px 0" }}>
            <strong style={{ display: "block", fontSize: 13, color: "var(--ink-muted, #64748b)", marginBottom: 4 }}>
              Qo'shimcha izoh:
            </strong>
            <span style={{ fontSize: 14 }}>{order.comment}</span>
          </div>
        )}

        {confirmAction && (
          <div style={{ background: confirmAction.danger ? "#fff1f2" : "var(--sea, #f0f9ff)", border: `1px solid ${confirmAction.danger ? "#fda4af" : "rgba(2, 132, 199, 0.3)"}`, borderRadius: 12, padding: "16px", margin: "16px 0" }}>
            <h4 style={{ margin: "0 0 8px", color: confirmAction.danger ? "#be123c" : "var(--ink, #0f172a)", fontSize: 16 }}>{confirmAction.title}</h4>
            <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--ink)" }}>{confirmAction.message}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className={`btn ${confirmAction.danger ? "danger" : ""}`} disabled={busy} onClick={confirmAction.onConfirm}>
                Tasdiqlash
              </button>
              <button className="btn ghost" disabled={busy} onClick={() => setConfirmAction(null)}>
                Bekor qilish
              </button>
            </div>
          </div>
        )}

        {canceling ? (
          <div style={{ background: "#fff1f2", border: "1px solid #fda4af", borderRadius: 12, padding: "16px", margin: "16px 0" }}>
            <h4 style={{ margin: "0 0 10px", color: "#be123c", fontSize: 16 }}>Buyurtmani bekor qilish sababini ko'rsating</h4>
            <div className="field" style={{ marginBottom: 10 }}>
              <label htmlFor="cancel-preset">Asosiy sabab:</label>
              <select
                id="cancel-preset"
                value={cancelReasonPreset}
                onChange={(e) => setCancelReasonPreset(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: 8 }}
              >
                <option value="Mijoz rad etdi / O'zi bekor qildi">Mijoz rad etdi / O'zi bekor qildi</option>
                <option value="Mahsulot omborda qolmagan">Mahsulot omborda qolmagan</option>
                <option value="Mijoz telefoniga javob bermadi">Mijoz telefoniga javob bermadi</option>
                <option value="Narx yoki yetkazib berish shartlari to'g'ri kelmadi">Narx yoki yetkazib berish shartlari to'g'ri kelmadi</option>
                <option value="Boshqa">Boshqa sabab (qo'lda yozish)...</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="cancel-detail">Qo'shimcha tafsilot / izoh:</label>
              <textarea
                id="cancel-detail"
                value={cancelReasonText}
                onChange={(e) => setCancelReasonText(e.target.value)}
                placeholder="Masalan: Mijoz bilan bog'lanildi, 2 haftadan keyin qayta murojaat qiladi..."
                style={{ minHeight: 60, width: "100%" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn danger" disabled={busy} onClick={confirmCancel}>
                Bekor qilishni tasdiqlash
              </button>
              <button className="btn ghost" disabled={busy} onClick={() => setCanceling(false)}>
                Orqaga
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="note">Menejer izohi</label>
              <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} style={{ minHeight: 80 }} />
            </div>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              {order.status === "NEW" && (
                <button
                  className="btn"
                  style={{ background: "#0284c7" }}
                  disabled={busy}
                  onClick={() => patch({ status: "CONFIRMED", managerNote: note })}
                >
                  ✓ Tasdiqlash (Mijozga SMS va Bildirishnoma)
                </button>
              )}
              {order.status === "CONFIRMED" && (
                <button
                  className="btn"
                  style={{ background: "#059669" }}
                  disabled={busy}
                  onClick={() => patch({ status: "READY", managerNote: note })}
                >
                  Olib ketishga tayyor (READY)
                </button>
              )}
              {order.status === "READY" && (
                <button className="btn" style={{ background: "#16a34a" }} disabled={busy} onClick={() => patch({ status: "DONE", managerNote: note })}>
                  Bajarildi (Mijoz olib ketdi)
                </button>
              )}
              {!order.isPaid && order.status !== "CANCELED" && order.status !== "FAKE" && (
                <button
                  className="btn sm"
                  style={{ background: "#059669", color: "#fff" }}
                  disabled={busy}
                  onClick={markPaid}
                >
                  Kassada to'landi deb belgilash
                </button>
              )}
              {(order.status === "NEW" || order.status === "CONFIRMED" || order.status === "READY") && (
                <button className="btn ghost" disabled={busy} style={{ color: "#ef4444" }} onClick={() => setCanceling(true)}>
                  Bekor qilish...
                </button>
              )}
              {order.status !== "FAKE" && <button className="btn danger" disabled={busy} onClick={markFake}>Soxta (Bekor va Bloklash)</button>}
              <button className="btn ghost" disabled={busy} onClick={() => patch({ managerNote: note })}>Izohni saqlash</button>
              <button className="btn ghost" disabled={busy} onClick={blockNow}>Raqamni bloklash</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
