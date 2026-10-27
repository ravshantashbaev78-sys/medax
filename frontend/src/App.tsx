import { Suspense, lazy } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Shell";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import ProductPage from "./pages/ProductPage";
import Cart from "./pages/Cart";
import Contact from "./pages/Contact";
import CustomerAccount from "./pages/CustomerAccount";
import { CustomerAuthProvider } from "./customerAuth";
import { AuthModal } from "./components/AuthModal";
import { ThemeProvider } from "./context/ThemeContext";
import { I18nProvider } from "./context/I18nContext";
import { ScrollToTop } from "./components/ScrollToTop";

// Lazy-loaded Admin pages to optimize main client bundle
const AdminLayout = lazy(() => import("./admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const Dashboard = lazy(() => import("./admin/AdminLayout").then((m) => ({ default: m.Dashboard })));
const Login = lazy(() => import("./admin/AdminLayout").then((m) => ({ default: m.Login })));
const ProductList = lazy(() => import("./admin/Products").then((m) => ({ default: m.ProductList })));
const ProductForm = lazy(() => import("./admin/Products").then((m) => ({ default: m.ProductForm })));
const Taxonomy = lazy(() => import("./admin/Taxonomy"));
const Orders = lazy(() => import("./admin/Orders"));
const AdminCustomersPage = lazy(() => import("./admin/Customers"));
const ContactMessagesPage = lazy(() => import("./admin/Misc").then((m) => ({ default: m.ContactMessagesPage })));
const ImportPage = lazy(() => import("./admin/Misc").then((m) => ({ default: m.ImportPage })));
const Blocklist = lazy(() => import("./admin/Misc").then((m) => ({ default: m.Blocklist })));
const Users = lazy(() => import("./admin/Misc").then((m) => ({ default: m.Users })));

const AdminLoading = () => (
  <div className="wrap" style={{ padding: "60px 20px", textAlign: "center" }}>
    <div style={{ display: "inline-block", padding: "12px 24px", background: "var(--card)", borderRadius: 12, border: "1px solid var(--line)", fontWeight: 600 }}>
      Yuklanmoqda...
    </div>
  </div>
);

function NotFound() {
  return (
    <main className="wrap">
      <div className="done">
        <h1 style={{ fontSize: 34 }}>Sahifa topilmadi</h1>
        <p className="muted">Manzil noto'g'ri yoki sahifa o'chirilgan.</p>
        <Link className="btn" to="/">Bosh sahifaga</Link>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <CustomerAuthProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="product/:slug" element={<ProductPage />} />
              <Route path="cart" element={<Cart />} />
              <Route path="contact" element={<Contact />} />
              <Route path="account" element={<CustomerAccount />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route
              path="admin/login"
              element={
                <Suspense fallback={<AdminLoading />}>
                  <Login />
                </Suspense>
              }
            />
            <Route
              path="admin"
              element={
                <Suspense fallback={<AdminLoading />}>
                  <AdminLayout />
                </Suspense>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="products" element={<ProductList />} />
              <Route path="products/:id" element={<ProductForm />} />
              <Route path="taxonomy" element={<Taxonomy />} />
              <Route path="messages" element={<ContactMessagesPage />} />
              <Route path="import" element={<ImportPage />} />
              <Route path="blocklist" element={<Blocklist />} />
              <Route path="users" element={<Users />} />
            </Route>
          </Routes>
          <AuthModal />
        </CustomerAuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
