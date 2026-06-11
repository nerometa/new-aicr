import { Elysia } from 'elysia';
import { PROVIDER_NAMES } from '../services/providers';

export const providersRoute = new Elysia({ prefix: '/api/providers' })
  .get('/', () => ({
    providers: PROVIDER_NAMES,
  }));
