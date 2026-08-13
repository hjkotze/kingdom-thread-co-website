const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

// Accepts either the camelCase shape used across the API (addressLine1 etc.)
// or the raw snake_case DB row — whichever fields are present get used, so
// call sites never need to normalise first.
function formatAddress(source) {
  if (!source) return null;
  const line1 = source.addressLine1 ?? source.address_line1;
  const complex = source.addressComplex ?? source.address_complex;
  const suburb = source.addressSuburb ?? source.address_suburb;
  const postalCode = source.addressPostalCode ?? source.address_postal_code;
  const province = source.addressProvince ?? source.address_province;

  const lines = [line1, complex, suburb, [postalCode, province].filter(Boolean).join(" ")].filter(
    (part) => part && String(part).trim(),
  );

  return lines.length > 0 ? lines.join("\n") : null;
}

function isCompleteAddress(source) {
  if (!source) return false;
  const line1 = source.addressLine1 ?? source.address_line1;
  const suburb = source.addressSuburb ?? source.address_suburb;
  const postalCode = source.addressPostalCode ?? source.address_postal_code;
  const province = source.addressProvince ?? source.address_province;
  return Boolean(line1 && line1.trim() && suburb && suburb.trim() && postalCode && postalCode.trim() && province && province.trim());
}

module.exports = { PROVINCES, formatAddress, isCompleteAddress };
