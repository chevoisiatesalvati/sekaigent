import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";

/**
 * MVP admin auth: Bearer token = HMAC-SHA256(adminAddress, ADMIN_JWT_SECRET)
 * or raw header x-admin-address matching ADMIN_ADDRESS when secret token matches.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const auth = req.headers.authorization ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token || !config.adminAddress) {
      throw new UnauthorizedException("admin auth required");
    }

    const expected = createHmac("sha256", config.adminJwtSecret)
      .update(config.adminAddress)
      .digest("hex");

    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException("invalid admin token");
    }
    return true;
  }
}

export function mintAdminToken(adminAddress: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(adminAddress.toLowerCase())
    .digest("hex");
}
