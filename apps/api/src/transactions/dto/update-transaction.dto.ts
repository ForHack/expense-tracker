import { PartialType } from '@nestjs/swagger';
import { CreateTransactionDto } from './create-transaction.dto';

/**
 * Тело `PATCH /api/transactions/:id` — все поля {@link CreateTransactionDto} опциональны.
 * Непереданное поле остаётся прежним.
 *
 * `PartialType` берётся из `@nestjs/swagger`, а не из `@nestjs/mapped-types`: он наследует
 * и правила class-validator, и метаданные `@ApiProperty`, поэтому схема в Swagger не пустует.
 */
export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}
