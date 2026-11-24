import { createHash, randomBytes } from "node:crypto";

export function createAgentKey() {
  return "ais_" + randomBytes(32).toString("hex");
}
export function hashAgentKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}
