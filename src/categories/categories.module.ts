import { Module, forwardRef } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { DatabaseModule } from '../database/database.module';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  imports: [DatabaseModule, forwardRef(() => VehiclesModule)],
  exports: [CategoriesService],
})
export class CategoriesModule {}
