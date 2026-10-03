import type {
  AuthContext,
  AuthenticatedUser,
} from "./auth.types";

import type {
  AuditMetadata,
} from "./common.types";

declare global {
  namespace Express {
    /**
     * Authenticated user attached by authentication
     * middleware.
     */
    interface User
      extends AuthenticatedUser {}

    /**
     * Request-level authentication context.
     */
    interface Request {
      user?: AuthenticatedUser;
      auth?: AuthContext;

      /**
       * Unique identifier assigned to each request.
       */
      requestId?: string;

      /**
       * Request audit metadata.
       */
      audit?: AuditMetadata;

      /**
       * Indicates whether authentication middleware
       * has successfully processed the request.
       */
      isAuthenticated?: boolean;

      /**
       * Parsed client IP address.
       */
      clientIp?: string;

      /**
       * Current authenticated branch.
       */
      branchId?: string;

      /**
       * Current authenticated user's permissions.
       */
      permissions?: string[];

      /**
       * Current authenticated user's role.
       */
      roleCode?: string;
    }

    /**
     * Response locals used throughout the API.
     */
    interface Locals {
      /**
       * Request correlation identifier.
       */
      requestId?: string;

      /**
       * Authenticated user.
       */
      user?: AuthenticatedUser;

      /**
       * Authentication context.
       */
      auth?: AuthContext;

      /**
       * Response processing metadata.
       */
      responseTime?: number;
    }
  }
}

export {};