import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoriesCqrsHandlers } from './cqrs';

@Module({
  imports: [CqrsModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, ...CategoriesCqrsHandlers],
})
export class CategoriesModule {}
