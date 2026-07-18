import { BrowserRouter, Routes, Route } from "react-router";
import { AuthProvider } from "./lib/auth/AuthContext";
import { QuoteDraftProvider } from "./lib/quote/QuoteDraftContext";
import ProtectedRoute from "./lib/auth/ProtectedRoute";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminQuoteDetail from "./pages/AdminQuoteDetail";
import ProductQuoteStart from "./pages/ProductQuoteStart";
import ProductQuoteCustomise from "./pages/ProductQuoteCustomise";
import QuoteReview from "./pages/QuoteReview";
import QuoteDetail from "./pages/QuoteDetail";

export default function App() {
  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <BrowserRouter>
        <AuthProvider>
          <QuoteDraftProvider>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/account"
                element={
                  <ProtectedRoute role="customer">
                    <Account />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account/quotes/:id"
                element={
                  <ProtectedRoute role="customer">
                    <QuoteDetail />
                  </ProtectedRoute>
                }
              />

              {/* Quote request flow (§4). Product selection and the
                  customisation page are reachable while signed out — the
                  auth gate only kicks in at the final review/submit step,
                  and the in-progress selection survives the redirect via
                  QuoteDraftProvider (sessionStorage). */}
              <Route path="/quote/:productId" element={<ProductQuoteStart />} />
              <Route path="/quote/:productId/customise" element={<ProductQuoteCustomise />} />
              <Route
                path="/quote/review"
                element={
                  <ProtectedRoute role="customer">
                    <QuoteReview />
                  </ProtectedRoute>
                }
              />

              {/* Admin surface: no links to these routes anywhere in the
                  customer-facing UI (§1) — reachable only by direct URL. */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute role="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/quotes/:id"
                element={
                  <ProtectedRoute role="admin">
                    <AdminQuoteDetail />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </QuoteDraftProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
