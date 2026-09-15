import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';

/**
 * Тело `PATCH /api/transactions/:id` — все поля {@link CreateTransactionDto} опциональны.
 * Непереданное поле остаётся прежним.
 */
export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}
