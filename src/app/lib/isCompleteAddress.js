// Kept in sync manually with server/src/lib/address.js's isCompleteAddress
// — see that file for why this isn't a shared package.
export function isCompleteAddress(user) {
  if (!user) return false;
  return Boolean(
    user.addressLine1?.trim() &&
      user.addressSuburb?.trim() &&
      user.addressPostalCode?.trim() &&
      user.addressProvince?.trim(),
  );
}
