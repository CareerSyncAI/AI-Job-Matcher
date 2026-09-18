import axios from "axios";
import { getAccessToken } from "@/lib/api/client";
import { env } from "@/lib/config/env";

/**
 * Determines whether the frontend is permitted to fall back to mock demo data.
 * 
 * Policy:
 * - Allowed ONLY if explicitly in mock mode (`NEXT_PUBLIC_USE_MOCK=true`).
 * - Allowed if unauthenticated (guest demo exploration before logging in).
 * - Allowed if the backend server is completely offline / network connection fails (ERR_NETWORK, ECONNREFUSED).
 * 
 * STRICT PROHIBITION:
 * - If user is authenticated AND backend responded with an HTTP error code (401, 403, 404, 422, 500),
 *   DO NOT silently replace the error with fake mock data. Propagate the real error!
 */
export function shouldFallbackToMock(error: unknown): boolean {
  if (env.useMock) return true;
  if (!getAccessToken()) return true;

  if (axios.isAxiosError(error)) {
    // If there is no response, the network/server connection failed (offline mode)
    if (!error.response || error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") {
      return true;
    }
  }

  // Real backend HTTP response code (4xx, 5xx): Do not mask!
  return false;
}
