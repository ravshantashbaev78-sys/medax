import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAdminI18n } from "./i18n";

interface CustomerItem {
  id: number;
  name: string;
  phone?: string | null;
  organization?: string | null;
  createdAt: string;
  _count: { orders: number };
}

function formatUzPhone(phone?: string | null) {
  if (!phone) return "-";
  const p = phone.trim();
  if (p.startsWith("+998") && p.length === 13) {
    return `+998 ${p.slice(4, 6)} ${p.slice(6, 9)} ${p.slice(9, 11)} ${p.slice(11, 13)}`;
  }
  return p;
}

function fmtDate(iso: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${day}.${month}.${year} ${time}`;
}

export default function AdminCustomersPage() {
  const { lang } = useAdminI18n();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search.trim()) q.set("search", search.trim());
      const data = await api<{ items: CustomerItem[]; total: number }>(`/admin/customers?${q.toString()}`, {
        admin: true,
      });
      setCustomers(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Load customers error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  return (
    <>
      <h1>
        {lang === "ru"
          ? `Зарегистрированные клиенты (${total})`
          : lang === "en"
          ? `Registered Customers (${total})`
          : `Ro'yxatdan o'tgan mijozlar (${total})`}
      </h1>

      <div className="row" style={{ marginBottom: 16 }}>
        <form
          className="search"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            loadCustomers();
          }}
          style={{ maxWidth: 420, flex: 1 }}
        >
          <input
            type="search"
            placeholder={
              lang === "ru"
                ? "Поиск по имени, номеру или организации..."
                : "Ism, telefon yoki tashkilot bo'yicha qidirish..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn sm">
            {lang === "ru" ? "Поиск" : "Qidirish"}
          </button>
        </form>
      </div>

      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 70 }}>ID</th>
              <th style={{ minWidth: 170 }}>{lang === "ru" ? "Клиент" : lang === "en" ? "Customer" : "Mijoz"}</th>
              <th style={{ minWidth: 190 }}>{lang === "ru" ? "Организация / Клиника" : lang === "en" ? "Organization / Clinic" : "Tashkilot / Klinika"}</th>
              <th style={{ minWidth: 160 }}>{lang === "ru" ? "Телефон" : lang === "en" ? "Phone" : "Telefon"}</th>
              <th style={{ minWidth: 150 }}>{lang === "ru" ? "Заказы" : lang === "en" ? "Orders" : "Buyurtmalar soni"}</th>
              <th style={{ minWidth: 150 }}>{lang === "ru" ? "Дата регистрации" : lang === "en" ? "Registered Date" : "Ro'yxatdan o'tgan sana"}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 36 }} className="muted">
                  {lang === "ru" ? "Загрузка..." : "Yuklanmoqda..."}
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 36 }} className="muted">
                  {lang === "ru" ? "Клиенты не найдены." : "Mijozlar topilmadi."}
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <span style={{ fontWeight: 800, color: "var(--brand, #0284c7)" }}>
                      #{c.id}
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontSize: 14.5 }}>{c.name}</strong>
                  </td>
                  <td className="muted" style={{ fontSize: 13.5 }}>
                    {c.organization || (lang === "ru" ? "Физическое лицо" : lang === "en" ? "Individual" : "Jismoniy shaxs")}
                  </td>
                  <td>
                    {c.phone ? (
                      <a
                        href={`tel:${c.phone}`}
                        style={{
                          color: "var(--brand, #0284c7)",
                          fontWeight: 600,
                          fontSize: 14,
                          textDecoration: "none",
                        }}
                      >
                        {formatUzPhone(c.phone)}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <Link
                      to={`/admin/orders?q=${encodeURIComponent(c.phone || c.name)}`}
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: c._count?.orders > 0 ? "rgba(2, 132, 199, 0.12)" : "rgba(100, 116, 139, 0.08)",
                        color: c._count?.orders > 0 ? "#0284c7" : "var(--ink2)",
                        fontWeight: 700,
                        fontSize: 12.5,
                        textDecoration: "none",
                        transition: "all 0.2s ease",
                      }}
                      title="Ushbu mijozning buyurtmalarini ko'rish"
                    >
                      {c._count?.orders || 0} {lang === "ru" ? "заказов" : lang === "en" ? "orders" : "ta buyurtma"}
                    </Link>
                  </td>
                  <td className="muted" style={{ fontSize: 13 }}>
                    {fmtDate(c.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
