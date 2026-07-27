import { Module, forwardRef } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';
import { DatabaseModule } from '../database/database.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  controllers: [VehiclesController],
  providers: [VehiclesService],
  imports: [DatabaseModule, forwardRef(() => CategoriesModule)],
  exports: [VehiclesService],
})
export class VehiclesModule {}
