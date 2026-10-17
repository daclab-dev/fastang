import { defineApiRoute } from '@fastang/core/api';
import { ContextSchema, type RequestContextData } from '../../shared/contracts';

export default defineApiRoute<{ Reply: RequestContextData }>({
  schema: { response: { 200: ContextSchema } },
  // Solo dimostrazione dell'isolamento; questo header non è un'identità autenticata.
  handler: async (request) => ({ label: String(request.headers['x-request-label'] ?? 'visitatore').slice(0, 80) }),
});
