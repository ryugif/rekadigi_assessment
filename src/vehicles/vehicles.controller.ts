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
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CategoriesService } from '../categories/categories.service';

@ApiTags('Listings')
@Controller('listings')
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly categoryService: CategoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a listing' })
  @ApiBody({ type: CreateVehicleDto })
  @ApiCreatedResponse({
    description: 'Listing created',
    schema: {
      example: {
        id: '5f26c42f-a32c-4b19-95eb-7a7ef1737368',
        make: 'Honda',
        model: 'Civic RS',
        year: 2022,
        price: 385000000,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Category not found' })
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
  @ApiOperation({ summary: 'Get listings with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiQuery({ name: 'search', required: false, example: 'civic' })
  @ApiQuery({
    name: 'filters',
    required: false,
    description:
      'JSON string. Example: {"make":"Honda","minPrice":100000000,"maxPrice":500000000}',
    example: '{"make":"Honda","minPrice":100000000,"maxPrice":500000000}',
  })
  @ApiOkResponse({
    description: 'Paginated listing result',
    schema: {
      example: {
        data: [
          {
            id: '5f26c42f-a32c-4b19-95eb-7a7ef1737368',
            make: 'Honda',
            model: 'Civic RS',
            year: 2022,
            mileage: 18000,
            price: 385000000,
            condition: 'used',
            transmission: 'automatic',
            fuel_type: 'petrol',
            color: 'White',
            location: 'Jakarta',
            status: 'available',
            primary_image: {
              id: '0f18ea3e-96ec-4e5b-8f6c-5304c8f8e173',
              url: 'https://cdn.example.com/listings/civic-front.jpg',
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid filters JSON or invalid query value',
  })
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
  @ApiOperation({ summary: 'Get available filter attributes for a category' })
  @ApiQuery({
    name: 'categoryId',
    required: true,
    example: '39f5dd74-e14b-4ad8-a2f5-3da4d5f17915',
  })
  @ApiOkResponse({
    description: 'Filter attributes derived from available listings',
    schema: {
      example: {
        categoryId: '39f5dd74-e14b-4ad8-a2f5-3da4d5f17915',
        attributes: [
          {
            key: 'price',
            type: 'range',
            label: 'Price',
            min: 100000000,
            max: 500000000,
          },
          {
            key: 'condition',
            type: 'enum',
            label: 'Condition',
            options: ['new', 'used'],
          },
          {
            key: 'hasPrimaryImage',
            type: 'boolean',
            label: 'Has Primary Image',
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'categoryId query parameter is required',
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
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
  @ApiOperation({ summary: 'Get search suggestions for listing names' })
  @ApiQuery({ name: 'search', required: false, example: 'hon' })
  @ApiQuery({
    name: 'query',
    required: false,
    example: 'hon',
    description: 'Fallback parameter when search is not provided',
  })
  @ApiQuery({
    name: 'filters',
    required: false,
    description: 'JSON string for suggestion filters (make, model, city)',
    example: '{"city":"jakarta"}',
  })
  @ApiQuery({ name: 'limit', required: false, example: 5 })
  @ApiOkResponse({
    description: 'Suggestion list',
    schema: {
      example: [
        {
          id: '5f26c42f-a32c-4b19-95eb-7a7ef1737368',
          name: 'Honda Civic RS',
        },
        {
          id: 'f3a1ed8e-f445-4cc8-8fc3-a877637903c6',
          name: 'Honda Brio',
        },
      ],
    },
  })
  @ApiBadRequestResponse({ description: 'search parameter is required' })
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
  @ApiOperation({ summary: 'Get listing detail by id' })
  @ApiParam({ name: 'id', description: 'Listing id (UUID)' })
  @ApiOkResponse({
    description: 'Listing detail',
    schema: {
      example: {
        id: '5f26c42f-a32c-4b19-95eb-7a7ef1737368',
        make: 'Honda',
        model: 'Civic RS',
        year: 2022,
        mileage: 18000,
        price: 385000000,
        condition: 'used',
        transmission: 'automatic',
        fuel_type: 'petrol',
        color: 'White',
        location: 'Jakarta',
        status: 'available',
        created_at: '2026-07-01T08:12:00.000Z',
        updated_at: '2026-07-15T09:45:00.000Z',
        category: {
          id: '39f5dd74-e14b-4ad8-a2f5-3da4d5f17915',
          name: 'Cars',
          slug: 'cars',
        },
        primary_image: {
          id: '0f18ea3e-96ec-4e5b-8f6c-5304c8f8e173',
          url: 'https://cdn.example.com/listings/civic-front.jpg',
          sort_order: 1,
          is_primary: true,
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Listing not found' })
  async findOne(@Param('id') id: string) {
    return await this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a listing by id' })
  @ApiParam({ name: 'id', description: 'Listing id (UUID)' })
  @ApiBody({ type: UpdateVehicleDto })
  @ApiOkResponse({
    description: 'Listing updated',
    schema: {
      example: {
        id: '5f26c42f-a32c-4b19-95eb-7a7ef1737368',
        make: 'Honda',
        model: 'Civic RS',
        year: 2023,
        price: 395000000,
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Listing or category not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
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
  @ApiOperation({ summary: 'Soft delete listing by id' })
  @ApiParam({ name: 'id', description: 'Listing id (UUID)' })
  @ApiOkResponse({
    description: 'Listing deleted',
    schema: {
      example: [],
    },
  })
  @ApiNotFoundResponse({ description: 'Listing not found' })
  async remove(@Param('id') id: string) {
    const exists = await this.vehiclesService.checkVehicleExists(id);
    if (!exists) {
      throw new NotFoundException(`Vehicle with ID ${id} not found`);
    }

    return this.vehiclesService.remove(id);
  }
}
