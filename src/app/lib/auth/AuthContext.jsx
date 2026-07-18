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

  // Registration no longer establishes a session — the account is
  // unverified and unusable until the email verification link is clicked
  // (see VerifyEmail.jsx / setAuthenticatedUser below).
  const register = useCallback(async (input) => {
    return authApi.registerCustomer(input);
  }, []);

  // Used by any flow that establishes a session server-side without going
  // through login() itself — email verification and password reset both
  // log the user in as their final step.
  const setAuthenticatedUser = useCallback((authenticatedUser) => {
    setUser(authenticatedUser);
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

  const value = { user, loading, register, setAuthenticatedUser, login, loginAsAdmin, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
