import AdminLayout from "../components/admin/AdminLayout";
import AdminConfigTabs from "../components/admin/AdminConfigTabs";
import AdminPolicyEditor from "../components/admin/AdminPolicyEditor";

export default function AdminConfigCookiePolicy() {
  return (
    <AdminLayout maxWidthClassName="max-w-4xl">
      <AdminConfigTabs />
      <p className="text-accent text-xs tracking-widest uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>
        Configuration
      </p>
      <AdminPolicyEditor
        type="cookies"
        title="Cookie Policy"
        helpText="Stored in full — the client-facing page that displays this to customers is built separately."
      />
    </AdminLayout>
  );
}
