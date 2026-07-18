import { Navigate, useLocation } from "react-router";
import { useAuth } from "./AuthContext";

// Client-side route guarding is a UX convenience only — every protected
// endpoint is also enforced server-side (requireAuth/requireRole), which is
// the actual security boundary.
export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    const loginPath = role === "admin" ? "/admin/login" : "/login";
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
