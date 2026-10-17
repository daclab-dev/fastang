import { defineApiRoute } from '@fastang/core';
export default defineApiRoute({ schema: { response: { 200: { type: 'object', required: ['ok'], properties: { ok: { type: 'boolean' } } } } }, handler: async () => ({ ok: true }) });
