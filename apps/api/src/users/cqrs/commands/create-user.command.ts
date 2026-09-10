import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SafeUser, UsersService } from '../../users.service';

export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly name?: string,
    public readonly currency?: string,
  ) {}
}

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, SafeUser> {
  constructor(private readonly usersService: UsersService) {}

  execute(command: CreateUserCommand): Promise<SafeUser> {
    const { email, password, name, currency } = command;
    return this.usersService.create({ email, password, name, currency });
  }
}
