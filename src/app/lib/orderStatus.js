// Mirrors server/src/lib/orderStatus.js — the admin dropdown needs the
// full operational label set, the customer-facing views need the
// simplified mapping. Keep both lists in sync with the server copy.
export const STATUSES = ["not_started", "started", "in_progress", "complete", "packaged", "collected_by_courier", "completed"];

export const ADMIN_LABELS = {
  not_started: "Not started",
  started: "Started",
  in_progress: "Work in progress",
  complete: "Complete",
  packaged: "Packaged",
  collected_by_courier: "Collected by courier",
  completed: "Completed",
};

export const CUSTOMER_LABELS = {
  not_started: "Order received",
  started: "Getting started",
  in_progress: "In production",
  complete: "Production complete",
  packaged: "Packaged",
  collected_by_courier: "On its way",
  completed: "Delivered",
};

// Mirrors server/src/lib/orderStatus.js's SHIPPED_STATUSES — used by
// Account.jsx to filter "Your orders" down to what the header's
// "not yet shipped" badge is actually counting.
export const SHIPPED_STATUSES = ["collected_by_courier", "completed"];
