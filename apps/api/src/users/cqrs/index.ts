import { CreateUserHandler } from './commands/create-user.command';
import { GetUserByEmailHandler } from './queries/get-user-by-email.query';
import { GetUserByIdHandler } from './queries/get-user-by-id.query';

export * from './commands/create-user.command';
export * from './queries/get-user-by-email.query';
export * from './queries/get-user-by-id.query';

export const UsersCqrsHandlers = [CreateUserHandler, GetUserByEmailHandler, GetUserByIdHandler];
