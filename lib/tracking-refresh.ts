export function shouldRefreshTracking(key: unknown): boolean {
  const encoded = JSON.stringify(key ?? []);
  return (
    encoded.includes('"tracking"') ||
    ((encoded.includes('"fitness"') || encoded.includes('"profile"')) &&
      encoded.includes('"save"'))
  );
}
