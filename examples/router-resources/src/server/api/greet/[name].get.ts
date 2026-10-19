import { defineContractRoute } from '@fastang/core/contract-route';
import { greetingContract } from '../../../shared/greeting';

export default defineContractRoute(greetingContract, {
  handler: async request => ({ message: `Hello, ${request.params.name}!` }),
});
