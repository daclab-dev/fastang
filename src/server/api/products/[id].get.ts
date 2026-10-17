import { defineApiRoute } from '@fastang/core/api';
import { ProductSchema, ProductParamsSchema, ErrorSchema, type Product, type ProductParams, type ApiError } from '../../../shared/contracts';
import { findProduct } from '../../products';

export default defineApiRoute<{ Params: ProductParams; Reply: Product | ApiError }>({
  schema: { params: ProductParamsSchema, response: { 200: ProductSchema, 404: ErrorSchema } },
  handler: async (request, reply) => {
    const product = findProduct(request.params.id);
    if (!product) return reply.code(404).send({ error: 'Prodotto non trovato' });
    return product;
  },
});
