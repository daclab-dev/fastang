import type { Product } from '../shared/contracts';

const products: Product[] = [
  { id: 'starter', name: 'FastAng Starter', description: 'Angular e Fastify, dalla prima pagina al server di produzione.', price: 0 },
  { id: 'workshop', name: 'Fullstack Workshop', description: 'Una demo di route dinamica, API validata e dati trasferiti al browser.', price: 49 },
];

export function findProduct(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}
