import { Module } from '@nestjs/common';
import { FiltersService } from './filters.service';
import { FiltersController } from './filters.controller';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  controllers: [FiltersController],
  providers: [FiltersService],
  imports: [CategoriesModule],
})
export class FiltersModule {}
