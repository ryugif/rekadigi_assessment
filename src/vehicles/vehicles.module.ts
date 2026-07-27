import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { DatabaseModule } from '../database/database.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  controllers: [VehiclesController],
  providers: [VehiclesService],
  imports: [DatabaseModule, CategoriesModule],
})
export class VehiclesModule {}
