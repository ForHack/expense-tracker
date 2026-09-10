import { AssertAccountOwnedHandler } from './queries/assert-account-owned.query';

export * from './queries/assert-account-owned.query';

export const AccountsCqrsHandlers = [AssertAccountOwnedHandler];
