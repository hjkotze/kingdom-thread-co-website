import AdminHeader from "./AdminHeader";

// Shared chrome for every admin page — the fixed top header (nav + admin
// account menu) plus consistent page padding. Individual pages keep their
// own heading/content as children.
export default function AdminLayout({ children, maxWidthClassName = "max-w-3xl" }) {
  return (
    <>
      <AdminHeader />
      <section className="min-h-screen bg-background py-28 px-6">
        <div className={`${maxWidthClassName} mx-auto`}>{children}</div>
      </section>
    </>
  );
}
