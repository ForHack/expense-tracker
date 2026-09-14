/**
 * Публичное API слоя: только клиентобезопасные модули — этот барель импортируют
 * и Server Components, и `'use client'`-компоненты.
 * Серверные помощники Route Handlers тянут `next/server`, поэтому живут отдельно
 * и импортируются напрямую: `@/shared/api/route-error`.
 */
export { api, apiFetch, ApiRequestError, type ApiRequestOptions } from './api-client';
export { routeFetch } from './route-client';
