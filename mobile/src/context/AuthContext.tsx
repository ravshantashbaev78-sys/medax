import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Customer,
  fetchCustomerProfileStatus,
  TOKEN_KEY,
  CUSTOMER_CACHE_KEY,
  removePushToken,
} from "../api";

interface AuthContextType {
  customer: Customer | null;
  token: string | null;
  loading: boolean;
  loginWithToken: (newToken: string, customerData: Customer) => Promise<void>;
  logout: () => Promise<void>;
  /** Server hisobni o'chirgandan keyin: push-token so'rovisiz lokal tozalash */
  clearSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function readCachedCustomer(): Promise<Customer | null> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOMER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Customer) : null;
  } catch {
    return null;
  }
}

async function writeCachedCustomer(c: Customer | null) {
  try {
    if (c) await AsyncStorage.setItem(CUSTOMER_CACHE_KEY, JSON.stringify(c));
    else await AsyncStorage.removeItem(CUSTOMER_CACHE_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = async () => {
    await AsyncStorage.multiRemove([TOKEN_KEY, CUSTOMER_CACHE_KEY]).catch(() => {});
    setToken(null);
    setCustomer(null);
  };

  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (!savedToken) return;

        // Avval keshdagi profilni ko'rsatamiz — ilova internetsiz ham darhol ochiladi
        const cached = await readCachedCustomer();
        if (cached) {
          setToken(savedToken);
          setCustomer(cached);
        }

        const result = await fetchCustomerProfileStatus();
        if (result.status === "ok") {
          setToken(savedToken);
          setCustomer(result.customer);
          writeCachedCustomer(result.customer);
        } else if (result.status === "unauthorized") {
          // Faqat server tokenni rad etgandagina chiqaramiz
          await clearSession();
        } else if (!cached) {
          // Internet yo'q va kesh ham yo'q: token saqlanadi, keyingi safar qayta tekshiriladi
          setToken(savedToken);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loginWithToken = async (newToken: string, customerData: Customer) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    await writeCachedCustomer(customerData);
    setToken(newToken);
    setCustomer(customerData);
  };

  const logout = async () => {
    try {
      await removePushToken();
    } catch {
      // ignore
    }
    await clearSession();
  };

  const refreshProfile = async () => {
    const result = await fetchCustomerProfileStatus();
    if (result.status === "ok") {
      setCustomer(result.customer);
      writeCachedCustomer(result.customer);
    } else if (result.status === "unauthorized") {
      await clearSession();
    }
    // offline: hech narsa qilmaymiz
  };

  return (
    <AuthContext.Provider
      value={{
        customer,
        token,
        loading,
        loginWithToken,
        logout,
        clearSession,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
