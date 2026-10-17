import { Type, type Static } from '@sinclair/typebox';

export const ProductSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.String(),
  price: Type.Number(),
}, { additionalProperties: false });
export type Product = Static<typeof ProductSchema>;

export const ProductParamsSchema = Type.Object({ id: Type.String({ pattern: '^[a-z0-9-]+$', maxLength: 60 }) });
export type ProductParams = Static<typeof ProductParamsSchema>;

export const ContextSchema = Type.Object({ label: Type.String() }, { additionalProperties: false });
export type RequestContextData = Static<typeof ContextSchema>;

export const ErrorSchema = Type.Object({ error: Type.String() }, { additionalProperties: false });
export type ApiError = Static<typeof ErrorSchema>;
