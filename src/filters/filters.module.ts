import { Module } from '@nestjs/common';
import { FiltersController } from './filters.controller';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  controllers: [FiltersController],
  imports: [CategoriesModule],
})
export class FiltersModule {}
