import { Type } from '@sinclair/typebox';
import { defineApiRoute } from '../../../framework/api';

export default defineApiRoute<{ Reply: { status: 'ok'; framework: string } }>({
  schema: {
    response: { 200: Type.Object({ status: Type.Literal('ok'), framework: Type.String() }, { additionalProperties: false }) },
  },
  handler: async () => ({ status: 'ok', framework: 'FastAng' }),
});
