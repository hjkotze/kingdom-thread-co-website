import { BrowserRouter, Routes, Route, Navigate } from "react-router";
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
import AccountProfile from "./pages/AccountProfile";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminQuoteDetail from "./pages/AdminQuoteDetail";
import AdminProducts from "./pages/AdminProducts";
import AdminProductEdit from "./pages/AdminProductEdit";
import AdminCategories from "./pages/AdminCategories";
import AdminThreadColours from "./pages/AdminThreadColours";
import ProductQuoteStart from "./pages/ProductQuoteStart";
import ProductQuoteCustomise from "./pages/ProductQuoteCustomise";
import QuoteReview from "./pages/QuoteReview";
import QuoteDetail from "./pages/QuoteDetail";
import AdminQuotesList from "./pages/AdminQuotesList";
import AdminOrders from "./pages/AdminOrders";
import AdminConfigSettings from "./pages/AdminConfigSettings";
import AdminConfigPrivacyPolicy from "./pages/AdminConfigPrivacyPolicy";
import AdminConfigCookiePolicy from "./pages/AdminConfigCookiePolicy";
import OrderReview from "./pages/OrderReview";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import CookiePolicyPage from "./pages/CookiePolicyPage";

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
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/cookie-policy" element={<CookiePolicyPage />} />
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
                path="/account/profile"
                element={
                  <ProtectedRoute role="customer">
                    <AccountProfile />
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
              <Route
                path="/account/orders/review"
                element={
                  <ProtectedRoute role="customer">
                    <OrderReview />
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
                path="/admin/quotes"
                element={
                  <ProtectedRoute role="admin">
                    <AdminQuotesList />
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
              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute role="admin">
                    <AdminOrders />
                  </ProtectedRoute>
                }
              />

              {/* Configuration (§ admin console restructure) — Products,
                  Categories, and Thread Colours (full add/edit/delete on
                  top of the Airtable-backed live-first reads every other
                  product/category surface already uses), plus the small
                  config forms (Pricing/Site/Invoice settings) and the two
                  policy documents, all reachable via AdminConfigTabs. */}
              <Route
                path="/admin/configuration"
                element={<Navigate to="/admin/configuration/settings" replace />}
              />
              <Route
                path="/admin/configuration/products"
                element={
                  <ProtectedRoute role="admin">
                    <AdminProducts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/configuration/products/new"
                element={
                  <ProtectedRoute role="admin">
                    <AdminProductEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/configuration/products/:id"
                element={
                  <ProtectedRoute role="admin">
                    <AdminProductEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/configuration/categories"
                element={
                  <ProtectedRoute role="admin">
                    <AdminCategories />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/configuration/thread-colours"
                element={
                  <ProtectedRoute role="admin">
                    <AdminThreadColours />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/configuration/settings"
                element={
                  <ProtectedRoute role="admin">
                    <AdminConfigSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/configuration/privacy-policy"
                element={
                  <ProtectedRoute role="admin">
                    <AdminConfigPrivacyPolicy />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/configuration/cookie-policy"
                element={
                  <ProtectedRoute role="admin">
                    <AdminConfigCookiePolicy />
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
