import React, { createContext, useContext, useEffect, useState } from "react";

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  organization?: string | null;
  avatar?: string | null;
  hasPassword?: boolean;
}

interface CustomerAuthContextType {
  customer: Customer | null;
  token: string | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  refreshCustomer: () => Promise<void>;
  checkPhone: (phone: string) => Promise<{ exists: boolean; hasPassword: boolean }>;
  sendOtp: (phone: string, captchaToken?: string) => Promise<{ ok: boolean; resendIn: number }>;
  verifyOtp: (data: { phone: string; code: string; name?: string; organization?: string; password?: string }) => Promise<{ ok: boolean; token: string; customer: Customer }>;
  loginWithPassword: (phone: string, password: string) => Promise<{ ok: boolean; token: string; customer: Customer }>;
  forgotPasswordOtp: (phone: string, captchaToken?: string) => Promise<{ ok: boolean; message: string }>;
  resetPassword: (params: { phone: string; code: string; newPassword: string }) => Promise<{ ok: boolean; token: string; customer: Customer }>;
  changePassword: (data: { currentPassword?: string; newPassword: string }) => Promise<void>;
  updateProfile: (data: { name: string; organization?: string }) => Promise<void>;
  logout: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | null>(null);

export const CUSTOMER_TOKEN_KEY = "medax_customer_token";

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(CUSTOMER_TOKEN_KEY));
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const saveToken = (newToken: string | null) => {
    setToken(newToken);
    if (newToken) localStorage.setItem(CUSTOMER_TOKEN_KEY, newToken);
    else localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  };

  useEffect(() => {
    if (!token) {
      setCustomer(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch("/api/customer/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Authorization": `Bearer ${token}`,
        "X-Customer-Token": token,
      },
    })
      .then((res) => {
        const isJson = res.headers.get("content-type")?.includes("application/json");
        if (!res.ok || !isJson) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => setCustomer(data.customer))
      .catch(() => {
        saveToken(null);
        setCustomer(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const refreshCustomer = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/customer/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Authorization": `Bearer ${token}`,
          "X-Customer-Token": token,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.customer) setCustomer(data.customer);
      }
    } catch {}
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const checkPhone = async (phone: string) => {
    const res = await fetch("/api/customer/auth/check-phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Tekshirishda xatolik yuz berdi");
    return data;
  };

  // SMS orqali kod yuborish
  const sendOtp = async (phone: string, captchaToken?: string) => {
    const res = await fetch("/api/customer/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, captchaToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Kod yuborishda xatolik yuz berdi");
    }
    return data;
  };

  // Parolni unutganda SMS kod yuborish (12 soatda 1 marta limit)
  const forgotPasswordOtp = async (phone: string, captchaToken?: string) => {
    const res = await fetch("/api/customer/auth/forgot-password-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, captchaToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "SMS yuborishda xatolik yuz berdi");
    }
    return data;
  };

  // Parolni tiklash va yangilash
  const resetPassword = async (params: { phone: string; code: string; newPassword: string }) => {
    const res = await fetch("/api/customer/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Parolni tiklashda xatolik yuz berdi");
    }
    saveToken(data.token);
    setCustomer(data.customer);
    closeAuthModal();
    return data;
  };

  // SMS orqali kodni tasdiqlash
  const verifyOtp = async (params: {
    phone: string;
    code: string;
    name?: string;
    organization?: string;
    password?: string;
  }) => {
    const res = await fetch("/api/customer/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Tasdiqlash kodi noto'g'ri");
    }
    saveToken(data.token);
    setCustomer(data.customer);
    closeAuthModal();
    return data;
  };

  const loginWithPassword = async (phone: string, password: string) => {
    const res = await fetch("/api/customer/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Telefon raqam yoki parol noto'g'ri");
    }
    saveToken(data.token);
    setCustomer(data.customer);
    closeAuthModal();
    return data;
  };

  const changePassword = async (params: { currentPassword?: string; newPassword: string }) => {
    if (!token) throw new Error("Kirilmagan");
    const res = await fetch("/api/customer/auth/password", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Authorization": `Bearer ${token}`,
        "X-Customer-Token": token,
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Parolni o'zgartirishda xatolik");
    if (customer) setCustomer({ ...customer, hasPassword: true });
  };

  const updateProfile = async (params: { name: string; organization?: string }) => {
    if (!token) throw new Error("Kirilmagan");
    const res = await fetch("/api/customer/auth/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Authorization": `Bearer ${token}`,
        "X-Customer-Token": token,
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Profilni saqlashda xatolik");
    setCustomer(data.customer);
  };

  const logout = () => {
    saveToken(null);
    setCustomer(null);
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        token,
        loading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        refreshCustomer,
        checkPhone,
        sendOtp,
        verifyOtp,
        loginWithPassword,
        forgotPasswordOtp,
        resetPassword,
        changePassword,
        updateProfile,
        logout,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
