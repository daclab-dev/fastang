import { defineApiRoute } from '@fastang/core';
export default defineApiRoute<{ Params: { name: string } }>({
  schema: {
    params: { type: 'object', required: ['name'], properties: { name: { type: 'string', minLength: 1, maxLength: 80 } } },
    response: { 200: { type: 'object', required: ['message'], properties: { message: { type: 'string' } } } },
  },
  handler: async request => ({ message: `Hello, ${request.params.name}!` }),
});
