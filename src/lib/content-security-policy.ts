export const CSP_REPORT_GROUP = "alphaquiz-csp";
export const CSP_REPORT_PATH = "/api/security/csp-report";

export function createContentSecurityPolicy(
  nonce: string,
  development: boolean,
) {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self'${development ? " ws: wss:" : ""}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    `report-to ${CSP_REPORT_GROUP}`,
    `report-uri ${CSP_REPORT_PATH}`,
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
