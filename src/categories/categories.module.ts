import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  imports: [DatabaseModule],
})
export class CategoriesModule {}
