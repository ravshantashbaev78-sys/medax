import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Customer, fetchCustomerProfile, TOKEN_KEY, removePushToken } from "../api";

interface AuthContextType {
  customer: Customer | null;
  token: string | null;
  loading: boolean;
  loginWithToken: (newToken: string, customerData: Customer) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then(async (savedToken) => {
      if (savedToken) {
        const profile = await fetchCustomerProfile();
        if (profile) {
          setToken(savedToken);
          setCustomer(profile);
        } else {
          // Token muddati o'tgan yoki yaroqsiz — tozalaymiz
          await AsyncStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setCustomer(null);
        }
      } else {
        setToken(null);
        setCustomer(null);
      }
      setLoading(false);
    });
  }, []);

  const loginWithToken = async (newToken: string, customerData: Customer) => {
    await AsyncStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setCustomer(customerData);
  };

  const logout = async () => {
    try {
      await removePushToken();
    } catch {
      // ignore
    }
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setCustomer(null);
  };

  const refreshProfile = async () => {
    const profile = await fetchCustomerProfile();
    if (profile) {
      setCustomer(profile);
    } else {
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        customer,
        token,
        loading,
        loginWithToken,
        logout,
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
