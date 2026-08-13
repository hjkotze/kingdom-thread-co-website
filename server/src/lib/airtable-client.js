const env = require("../config/env");

// --- Airtable (legacy — replaced by NocoDB below). Kept commented out
// rather than deleted, in case of rollback. ---
// const Airtable = require("airtable");
//
// const AIRTABLE_TIMEOUT_MS = 8000;
//
// const base = new Airtable({
//   apiKey: env.airtable.apiKey,
//   requestTimeout: AIRTABLE_TIMEOUT_MS,
// }).base(env.airtable.baseId);
//
// async function listAllRecords(tableName, selectOptions = {}) {
//   const records = [];
//   await base(tableName)
//     .select(selectOptions)
//     .eachPage((pageRecords, fetchNextPage) => {
//       records.push(...pageRecords);
//       fetchNextPage();
//     });
//   return records;
// }
//
// async function createRecord(tableName, fields, { typecast = false } = {}) {
//   const record = await base(tableName).create(fields, { typecast });
//   return record;
// }
//
// async function updateRecord(tableName, recordId, fields, { typecast = false } = {}) {
//   const record = await base(tableName).update(recordId, fields, { typecast });
//   return record;
// }
//
// async function deleteRecord(tableName, recordId) {
//   await base(tableName).destroy(recordId);
// }
//
// async function uploadAttachment(recordId, fieldName, { filename, contentType, buffer }) {
//   const res = await fetch(
//     `https://content.airtable.com/v0/${env.airtable.baseId}/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`,
//     {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${env.airtable.apiKey}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ contentType, filename, file: buffer.toString("base64") }),
//     },
//   );
//   const data = await res.json();
//   if (!res.ok) {
//     throw new Error(`Airtable attachment upload failed (${res.status}): ${JSON.stringify(data)}`);
//   }
//   return data;
// }
//
// module.exports = { base, listAllRecords, createRecord, updateRecord, deleteRecord, uploadAttachment };

// --- NocoDB (current) ---
// Self-hosted, replaces Airtable as the product/category/thread-colour data
// source. Targets NocoDB's v3 Data API (record shape {id, fields}, which
// mirrors Airtable's closely enough that products/categories/threadColours
// .service.js needed no changes) rather than v2 (flatter records, CSV-joined
// multi-selects, and a separate endpoint call for every link-field write).

const NOCODB_TIMEOUT_MS = 8000;

// Table IDs, resolved once via GET /api/v2/meta/bases/{baseId}/tables against
// this instance's KingdomThreadCo base. Re-resolve via that same endpoint if
// the base is ever deleted and recreated (IDs are not stable across that).
const TABLE_IDS = {
  Products: "muf73xtpol8t9gh",
  Categories: "m0g6irpyv8dpemw",
  "Thread Colours": "md49w3daqw9r9jc",
  "Hero Images": "m3l67mxgj6my4e9",
};

// Link (relation) fields, keyed by table -> field name. NocoDB v3 represents
// these as [{id, fields}, ...] on read and expects [{id}, ...] on write;
// Airtable represented the same relationship as a flat [id, ...] array of
// linked record IDs. toAirtableShape()/fromAirtableFields() convert between
// the two so the rest of the app never sees the NocoDB-specific shape.
const LINK_FIELDS = {
  Products: ["Category"],
  // "Products" here is the reverse link back from Categories — read-only,
  // never written (categories.service.js's buildFields never includes it).
  Categories: ["Products"],
};

// Attachment field IDs, resolved via GET /api/v2/meta/tables/{tableId} — the
// v3 per-cell upload endpoint addresses fields by ID, not by name.
const ATTACHMENT_FIELD_IDS = {
  Products: { Image: "ckh45ybn0e97xzp" },
  Categories: { Image: "c204dljxf6e3pdv" },
  "Hero Images": { Image: "cvi0mayehoquqso" },
};

// MultiSelect field IDs, also resolved via GET /api/v2/meta/tables/{tableId}
// — needed to auto-create missing options (see ensureMultiSelectOptions
// below). Airtable's `typecast: true` silently created new select options
// on write; NocoDB's v3 Data API has no equivalent and instead rejects the
// *entire* record write (a 422, not a per-field warning) the moment any
// value isn't already a defined option — so adding a brand-new size/colour
// on a product failed to save not just that field but the whole edit
// (price, description, everything) with it. Confirmed live: PATCHing a
// product with Colours: ["White","Black"] 500'd with "Invalid option(s)
// \"Black\"..." because "Black" had never been used before, and none of
// the other changes in that request were saved either.
const MULTISELECT_FIELD_IDS = {
  Products: { Sizes: "c1cu6zf7ji4jztg", Colours: "c8v1wsinpxy5vkt" },
};

function tableId(tableName) {
  const id = TABLE_IDS[tableName];
  if (!id) throw new Error(`Unknown NocoDB table: ${tableName}`);
  return id;
}

async function nocodbFetch(pathOrUrl, { method = "GET", body } = {}) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${env.nocodb.baseUrl}${pathOrUrl}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NOCODB_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "xc-token": env.nocodb.apiToken,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new Error(`NocoDB request failed (${res.status} ${url}): ${JSON.stringify(data)}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

// {id, fields} with link fields collapsed from [{id, fields}, ...] down to
// [id, ...] (as strings) — the shape products/categories/threadColours
// .service.js already expect from Airtable.
function toAirtableShape(tableName, record) {
  const linkFields = LINK_FIELDS[tableName] || [];
  const attachmentFields = Object.keys(ATTACHMENT_FIELD_IDS[tableName] || {});
  const fields = { ...record.fields };
  for (const fieldName of linkFields) {
    const value = fields[fieldName];
    fields[fieldName] = Array.isArray(value) ? value.map((linked) => String(linked.id)) : [];
  }
  // NocoDB attachment objects come back with `signedPath`/`path`, not a
  // stable `url` (unlike Airtable) — firstAttachmentUrl() in
  // products/categories.service.js reads .url, so derive one. signedPath
  // is a ~2hr-expiring signed link; acceptable here because both
  // getProducts()/getCategories() re-fetch live on every request (only the
  // MySQL cache-fallback path, used when NocoDB is briefly unreachable, can
  // ever serve a stale/expired one).
  for (const fieldName of attachmentFields) {
    const value = fields[fieldName];
    if (Array.isArray(value)) {
      fields[fieldName] = value.map((att) =>
        att.url ? att : { ...att, url: `${env.nocodb.baseUrl}/${att.signedPath || att.path}` },
      );
    }
  }
  return { id: String(record.id), fields };
}

// Reverse of toAirtableShape() for outgoing create/update fields — link
// fields go from [id, ...] back to [{id: Number}, ...] for NocoDB's v3
// write shape.
function fromAirtableFields(tableName, fields) {
  const linkFields = LINK_FIELDS[tableName] || [];
  const out = { ...fields };
  for (const fieldName of linkFields) {
    if (fieldName in out) {
      const value = out[fieldName];
      out[fieldName] = (Array.isArray(value) ? value : [value]).filter(Boolean).map((linkedId) => ({ id: Number(linkedId) }));
    }
  }
  return out;
}

async function listAllRecords(tableName, selectOptions = {}) {
  const id = tableId(tableName);
  const records = [];
  let query = "pageSize=100";
  if (selectOptions.sort && selectOptions.sort.length > 0) {
    const [{ field, direction = "asc" }] = selectOptions.sort;
    query += `&sort=${encodeURIComponent(JSON.stringify([{ field, direction }]))}`;
  }
  let next = `/api/v3/data/${env.nocodb.baseId}/${id}/records?${query}`;
  while (next) {
    const data = await nocodbFetch(next);
    records.push(...data.records.map((r) => toAirtableShape(tableName, r)));
    next = data.next || null;
  }
  return records;
}

// Restores the "typecast" behavior callers already assumed worked (it was
// wired through from the Airtable client but never actually implemented
// against NocoDB — see the comment on MULTISELECT_FIELD_IDS). For each
// configured MultiSelect field present in `fields`, adds any values that
// aren't yet defined options to the column's schema before the record
// write goes out, so the write itself never gets rejected for this reason.
async function ensureMultiSelectOptions(tableName, fields) {
  const fieldIds = MULTISELECT_FIELD_IDS[tableName];
  if (!fieldIds) return;
  for (const [fieldName, fieldId] of Object.entries(fieldIds)) {
    const values = fields[fieldName];
    if (!Array.isArray(values) || values.length === 0) continue;
    const column = await nocodbFetch(`/api/v2/meta/columns/${fieldId}`);
    const existing = column.colOptions?.options || [];
    const existingTitles = new Set(existing.map((o) => o.title));
    const missing = [...new Set(values.filter((v) => !existingTitles.has(v)))];
    if (missing.length === 0) continue;
    await nocodbFetch(`/api/v2/meta/columns/${fieldId}`, {
      method: "PATCH",
      body: {
        colOptions: {
          options: [
            ...existing.map((o) => ({ title: o.title, color: o.color })),
            ...missing.map((title) => ({ title })),
          ],
        },
      },
    });
  }
}

async function createRecord(tableName, fields, { typecast = false } = {}) {
  const id = tableId(tableName);
  const preparedFields = fromAirtableFields(tableName, fields);
  if (typecast) await ensureMultiSelectOptions(tableName, preparedFields);
  const data = await nocodbFetch(`/api/v3/data/${env.nocodb.baseId}/${id}/records`, {
    method: "POST",
    body: { fields: preparedFields },
  });
  return toAirtableShape(tableName, data.records[0]);
}

async function updateRecord(tableName, recordId, fields, { typecast = false } = {}) {
  const id = tableId(tableName);
  const preparedFields = fromAirtableFields(tableName, fields);
  if (typecast) await ensureMultiSelectOptions(tableName, preparedFields);
  const data = await nocodbFetch(`/api/v3/data/${env.nocodb.baseId}/${id}/records`, {
    method: "PATCH",
    body: { id: Number(recordId), fields: preparedFields },
  });
  return toAirtableShape(tableName, data.records[0]);
}

async function deleteRecord(tableName, recordId) {
  const id = tableId(tableName);
  await nocodbFetch(`/api/v3/data/${env.nocodb.baseId}/${id}/records`, {
    method: "DELETE",
    body: { id: Number(recordId) },
  });
}

// tableName is required here (unlike Airtable's uploadAttachment) because
// NocoDB's per-cell upload endpoint is scoped by table ID, not just record
// ID — Airtable record IDs were unique across a whole base, NocoDB's aren't.
async function uploadAttachment(tableName, recordId, fieldName, { filename, contentType, buffer }) {
  const id = tableId(tableName);
  const fieldId = (ATTACHMENT_FIELD_IDS[tableName] || {})[fieldName];
  if (!fieldId) throw new Error(`No attachment field ID configured for ${tableName}.${fieldName}`);
  const data = await nocodbFetch(
    `/api/v3/data/${env.nocodb.baseId}/${id}/records/${recordId}/fields/${fieldId}/upload`,
    {
      method: "POST",
      body: { contentType, filename, file: buffer.toString("base64") },
    },
  );
  return toAirtableShape(tableName, data);
}

module.exports = { listAllRecords, createRecord, updateRecord, deleteRecord, uploadAttachment };
