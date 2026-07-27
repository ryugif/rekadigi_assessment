import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CategoriesService } from '../categories/categories.service';

@Controller('listings')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly categoryService: CategoriesService,
  ) {}

  @Post()
  async create(@Body() createVehicleDto: CreateVehicleDto) {
    if (createVehicleDto.categoryId) {
      const checkCategoryExists =
        await this.categoryService.checkCategoryExists(
          createVehicleDto.categoryId,
        );

      if (!checkCategoryExists) {
        throw new NotFoundException(
          `Category with ID ${createVehicleDto.categoryId} not found`,
        );
      }
    }

    return await this.vehiclesService.create(createVehicleDto);
  }

  @Get()
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc',
    @Query('search') search?: string,
    @Query('filters') filters?: string,
  ) {
    return this.vehiclesService.findAll({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      sortBy: sortBy || 'id',
      sortOrder: sortOrder || 'asc',
      search,
      filters: filters,
    });
  }

  @Get('filter-attributes')
  async getFilterAttributes(@Query('categoryId') categoryId?: string) {
    if (!categoryId) {
      throw new BadRequestException('categoryId query parameter is required');
    }

    const checkCategoryExists =
      await this.categoryService.checkCategoryExists(categoryId);

    if (!checkCategoryExists) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    return this.vehiclesService.getFilterAttributes(categoryId);
  }

  @Get('search/suggestions')
  async suggestions(
    @Query('search') search?: string,
    @Query('query') query?: string,
    @Query('filters') filters?: string,
    @Query('limit') limit: number = 5,
  ) {
    const searchTerm = search ?? query;

    if (!searchTerm) {
      throw new BadRequestException(
        'search parameter is required (query is supported as a fallback)',
      );
    }

    const parsedLimit = limit || 5;
    return this.vehiclesService.suggestions(searchTerm, parsedLimit, filters);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    if (updateVehicleDto.categoryId) {
      const checkCategoryExists =
        await this.categoryService.checkCategoryExists(
          updateVehicleDto.categoryId,
        );

      if (!checkCategoryExists) {
        throw new NotFoundException(
          `Category with ID ${updateVehicleDto.categoryId} not found`,
        );
      }
    }

    const exists = await this.vehiclesService.checkVehicleExists(id);
    if (!exists) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const exists = await this.vehiclesService.checkVehicleExists(id);
    if (!exists) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    return this.vehiclesService.remove(id);
  }
}
