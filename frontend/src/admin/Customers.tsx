import { useEffect, useState } from "react";
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
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h2>
            {lang === "ru"
              ? `Зарегистрированные клиенты (${total})`
              : lang === "en"
              ? `Registered Customers (${total})`
              : `Ro'yxatdan o'tgan mijozlar (${total})`}
          </h2>
          <p className="muted">
            {lang === "ru"
              ? "Пользователи, клиники и организации, зарегистрированные в системе."
              : lang === "en"
              ? "Users, clinics and medical organizations registered in the system."
              : "Tizimda ro'yxatdan o'tgan foydalanuvchilar, klinikalar va ularning buyurtmalari."}
          </p>
        </div>
      </div>

      <div className="adm-filter-bar" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          type="text"
          placeholder={
            lang === "ru"
              ? "Имя, телефон или организация..."
              : lang === "en"
              ? "Name, phone or clinic..."
              : "Ism, telefon yoki tashkilot..."
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadCustomers()}
          style={{ minWidth: 280 }}
        />
        <button className="btn sm ghost" onClick={loadCustomers}>
          {lang === "ru" ? "Поиск" : lang === "en" ? "Search" : "Qidirish"}
        </button>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{lang === "ru" ? "Клиент" : lang === "en" ? "Customer" : "Mijoz"}</th>
              <th>{lang === "ru" ? "Организация / Клиника" : lang === "en" ? "Organization / Clinic" : "Tashkilot / Klinika"}</th>
              <th>{lang === "ru" ? "Телефон" : lang === "en" ? "Phone" : "Telefon"}</th>
              <th>{lang === "ru" ? "Заказы" : lang === "en" ? "Orders" : "Buyurtmalar soni"}</th>
              <th>{lang === "ru" ? "Дата регистрации" : lang === "en" ? "Registered Date" : "Ro'yxatdan o'tgan sana"}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 30 }}>
                  {lang === "ru" ? "Загрузка..." : "Yuklanmoqda..."}
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 30 }} className="muted">
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
                    <b>{c.name}</b>
                  </td>
                  <td className="muted">
                    {c.organization || (lang === "ru" ? "Физическое лицо" : lang === "en" ? "Individual" : "Jismoniy shaxs")}
                  </td>
                  <td>
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} style={{ color: "var(--teal, #0d9488)", fontWeight: 600 }}>
                        {c.phone}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: c._count?.orders > 0 ? "rgba(13, 148, 136, 0.15)" : "var(--bg)",
                        color: c._count?.orders > 0 ? "#0d9488" : "var(--ink2)",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {c._count?.orders || 0} {lang === "ru" ? "заказов" : lang === "en" ? "orders" : "ta buyurtma"}
                    </span>
                  </td>
                  <td className="muted">
                    {new Date(c.createdAt).toLocaleDateString(lang === "ru" ? "ru-RU" : "uz-UZ", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
