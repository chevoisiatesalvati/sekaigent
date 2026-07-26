import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { config } from "../config.js";

/**
 * Admin auth: Bearer token must be the configured ADMIN_ADDRESS
 * (MissionVault ADMIN_ROLE holder / deployer). UI gates Bureau the same way
 * via on-chain hasRole; Nest only accepts that address.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const auth = req.headers.authorization ?? "";
    const presented = (
      auth.startsWith("Bearer ") ? auth.slice(7) : auth
    )
      .trim()
      .toLowerCase();

    if (!presented || !config.adminAddress) {
      throw new UnauthorizedException("admin auth required");
    }

    if (!isAddressEqual(presented, config.adminAddress)) {
      throw new UnauthorizedException("admin wallet required");
    }
    return true;
  }
}

/** Normalize and compare 0x addresses (lowercase hex). */
export function isAddressEqual(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(left) || !/^0x[0-9a-f]{40}$/.test(right)) {
    return false;
  }
  return left === right;
}
