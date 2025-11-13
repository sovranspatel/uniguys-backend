// "src/utils/redact.js"
cat > src/utils/redact.js <<'EOF'
/**
 * Simple redaction helper: remove common secret fields from objects before logging.
 * Returns a shallow-copy with redacted values.
 */
export const redact = (obj = {}, fields = ["password", "privateKey", "FIREBASE_PRIVATE_KEY", "token"]) => {
  if (!obj || typeof obj !== "object") return obj;
  const out = { ...obj };
  for (const f of fields) {
    if (f in out) out[f] = "[REDACTED]";
  }
  return out;
};
EOF