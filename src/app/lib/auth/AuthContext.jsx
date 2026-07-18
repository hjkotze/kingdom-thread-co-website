import { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .fetchCurrentUser()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const register = useCallback(async (input) => {
    const data = await authApi.registerCustomer(input);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async (input) => {
    const data = await authApi.loginCustomer(input);
    setUser(data.user);
    return data.user;
  }, []);

  const loginAsAdmin = useCallback(async (input) => {
    const data = await authApi.loginAdmin(input);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout({ asAdmin: user?.role === "admin" });
    setUser(null);
  }, [user]);

  const value = { user, loading, register, login, loginAsAdmin, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
