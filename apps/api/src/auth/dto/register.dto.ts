import { CreateUserDto } from '../../users/dto/create-user.dto';

/** Поля совпадают с созданием пользователя: email, password, name?, currency?. */
export class RegisterDto extends CreateUserDto {}
