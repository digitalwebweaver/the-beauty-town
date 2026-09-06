import type { AccessTokenPayload } from '@/utils/jwt';
import type { AuditContext } from '@/utils/auditContext';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      /** Set via setAuditContext() — read by the audit-capture middleware. */
      auditContext?: AuditContext;
    }
  }
}

export {};
