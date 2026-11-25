export function getTrustProxy(env = process.env) {
  const configured = env.TRUST_PROXY?.trim();
  if (!configured || configured === '0') {
    return false;
  }

  if (!/^[1-9]\d*$/.test(configured)) {
    throw new Error('TRUST_PROXY must be 0 or a positive proxy-hop count.');
  }
  const hops = Number(configured);
  if (!Number.isSafeInteger(hops) || hops > 10) {
    throw new Error('TRUST_PROXY must be between 1 and 10 when enabled.');
  }
  return hops;
}
