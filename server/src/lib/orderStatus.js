// Single source of truth for order production status — shared by the
// admin status-change endpoint (validation), the customer-facing label
// mapper, and the "not yet shipped" boundary used by the header badge
// count. Mirrored on the frontend (src/app/lib/orderStatus.js) since the
// admin dropdown and customer label display both need it client-side too.
const STATUSES = ["not_started", "started", "in_progress", "complete", "packaged", "collected_by_courier", "completed"];

const ADMIN_LABELS = {
  not_started: "Not started",
  started: "Started",
  in_progress: "Work in progress",
  complete: "Complete",
  packaged: "Packaged",
  collected_by_courier: "Collected by courier",
  completed: "Completed",
};

const CUSTOMER_LABELS = {
  not_started: "Order received",
  started: "Getting started",
  in_progress: "In production",
  complete: "Production complete",
  packaged: "Packaged",
  collected_by_courier: "On its way",
  completed: "Delivered",
};

// Once a courier has it (or the order is fully closed out), it no longer
// counts as "not yet shipped" for the customer header badge.
const SHIPPED_STATUSES = ["collected_by_courier", "completed"];

function isValidStatus(status) {
  return STATUSES.includes(status);
}

function customerLabelFor(status) {
  return CUSTOMER_LABELS[status] || status;
}

module.exports = { STATUSES, ADMIN_LABELS, CUSTOMER_LABELS, SHIPPED_STATUSES, isValidStatus, customerLabelFor };
