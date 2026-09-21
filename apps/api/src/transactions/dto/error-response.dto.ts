import { ApiProperty } from '@nestjs/swagger';

/**
 * Тело ошибки, как его формирует встроенный фильтр исключений Nest.
 * Описано классом, чтобы `@ApiResponse` мог ссылаться на схему, а не дублировать её.
 */
export class ErrorResponseDto {
  @ApiProperty({ description: 'HTTP-код ответа', example: 404 })
  statusCode!: number;

  @ApiProperty({
    description: 'Описание ошибки: строка либо список сообщений валидации',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Транзакция clx1a2b3c0000v8qk7m9n4p2r не найдена',
  })
  message!: string | string[];

  @ApiProperty({ description: 'Название статуса', example: 'Not Found' })
  error!: string;
}
