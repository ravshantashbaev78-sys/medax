import { FormEvent, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { useAdminI18n } from "./i18n";

interface Item { id: number; name: string; count: number; sortOrder?: number; country?: string | null }

function Block({ title, path, withCountry }: { title: string; path: "categories" | "brands"; withCountry?: boolean }) {
  const { t } = useAdminI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [extra, setExtra] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<Item[]>(`/admin/${path}`, { admin: true }).then(setItems).catch((e) => setError(e.message));
  }, [path]);
  useEffect(load, [load]);

  const payload = (n: string, x: string) =>
    withCountry ? { name: n, country: x || null } : { name: n, sortOrder: Number(x) || 0 };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api(`/admin/${path}`, { json: payload(name, extra), admin: true });
      setName(""); setExtra(""); load();
    } catch (err) { setError((err as ApiError).message); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try {
      await api(`/admin/${path}/${editing.id}`, { method: "PUT", json: payload(editing.name, withCountry ? editing.country || "" : String(editing.sortOrder ?? 0)), admin: true });
      setEditing(null); load();
    } catch (err) { setError((err as ApiError).message); }
  };

  const remove = async (i: Item) => {
    if (!confirm(`"${i.name}" ${t("confirm_del_taxonomy")}`)) return;
    try { await api(`/admin/${path}/${i.id}`, { method: "DELETE", admin: true }); load(); }
    catch (err) { setError((err as ApiError).message); }
  };

  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 22, marginBottom: 12 }}>{title}</h2>
      {error && <p className="err">{error}</p>}
      <form className="row" onSubmit={add}>
        <input type="text" style={{ flex: 2, minWidth: 180 }} placeholder={t("col_name")} value={name} onChange={(e) => setName(e.target.value)} required aria-label={t("col_name")} />
        <input type={withCountry ? "text" : "number"} style={{ flex: 1, minWidth: 120 }} placeholder={withCountry ? t("col_country") : t("col_sort_num")} value={extra} onChange={(e) => setExtra(e.target.value)} aria-label={withCountry ? t("col_country") : t("col_sort_num")} />
        <button className="btn">{t("add_new")}</button>
      </form>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("col_name")}</th>
              <th>{withCountry ? t("col_country") : t("col_sort")}</th>
              <th>{t("col_products_count")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                {editing?.id === i.id ? (
                  <>
                    <td><input type="text" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} aria-label={t("col_name")} /></td>
                    <td>{withCountry
                      ? <input type="text" value={editing.country || ""} onChange={(e) => setEditing({ ...editing, country: e.target.value })} aria-label={t("col_country")} />
                      : <input type="number" value={editing.sortOrder ?? 0} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} aria-label={t("col_sort")} />}</td>
                    <td>{i.count}</td>
                    <td style={{ whiteSpace: "nowrap" }}><button className="btn sm" onClick={saveEdit}>{t("save")}</button>{" "}<button className="btn ghost sm" onClick={() => setEditing(null)}>{t("cancel")}</button></td>
                  </>
                ) : (
                  <>
                    <td style={{ fontWeight: 600 }}>{i.name}</td>
                    <td>{withCountry ? i.country || "—" : i.sortOrder}</td>
                    <td>{i.count}</td>
                    <td style={{ whiteSpace: "nowrap" }}><button className="btn ghost sm" onClick={() => setEditing(i)}>{t("edit")}</button>{" "}<button className="btn ghost sm" onClick={() => remove(i)}>{t("delete")}</button></td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Taxonomy() {
  const { t } = useAdminI18n();
  return (
    <>
      <h1>{t("taxonomy_page_title")}</h1>
      <Block title={t("categories")} path="categories" />
      <Block title={t("brands")} path="brands" withCountry />
    </>
  );
}
