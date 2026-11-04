let regionNames = null;
try {
  regionNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch {
  regionNames = null;
}

export const countryName = (code) => {
  if (!code) return null;

  try {
    return regionNames?.of(code) || code;
  } catch {
    return code;
  }
};
