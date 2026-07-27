import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { VehiclesService } from '../vehicles/vehicles.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiCreatedResponse({
    description: 'Category created successfully',
    schema: {
      example: {
        id: '39f5dd74-e14b-4ad8-a2f5-3da4d5f17915',
        name: 'SUV',
        slug: 'suv',
        parent_id: null,
        path: 'suv',
        depth: 0,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories as a tree' })
  @ApiOkResponse({
    description: 'Category tree',
    schema: {
      example: [
        {
          id: '39f5dd74-e14b-4ad8-a2f5-3da4d5f17915',
          name: 'Cars',
          slug: 'cars',
          children: [
            {
              id: '9b8d4737-5f3e-4ec8-b74d-4d55431f9bb4',
              name: 'SUV',
              slug: 'suv',
              children: [],
            },
          ],
        },
      ],
    },
  })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id/listings')
  @ApiOperation({ summary: 'Get listings by category id with pagination' })
  @ApiParam({ name: 'id', description: 'Category id (UUID)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({ name: 'sortBy', required: false, example: 'createdAt' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiQuery({ name: 'search', required: false, example: 'honda' })
  @ApiQuery({
    name: 'filters',
    required: false,
    description:
      'JSON string. Example: {"minPrice":100000000,"maxPrice":500000000}',
    example: '{"minPrice":100000000,"maxPrice":500000000}',
  })
  @ApiOkResponse({
    description: 'Paginated listing result scoped by category',
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
  @ApiNotFoundResponse({ description: 'Category not found' })
  async findListings(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('sortBy') sortBy: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc',
    @Query('search') search?: string,
    @Query('filters') filters?: string,
  ) {
    const exists = await this.categoriesService.checkCategoryExists(id);
    if (!exists) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return this.vehiclesService.findAllByCategoryId(id, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
      sortBy: sortBy || 'id',
      sortOrder: sortOrder || 'asc',
      search,
      filters: filters,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category subtree by id' })
  @ApiParam({ name: 'id', description: 'Category id (UUID)' })
  @ApiOkResponse({
    description: 'Category subtree',
    schema: {
      example: [
        {
          id: '39f5dd74-e14b-4ad8-a2f5-3da4d5f17915',
          name: 'Cars',
          slug: 'cars',
          children: [
            {
              id: '9b8d4737-5f3e-4ec8-b74d-4d55431f9bb4',
              name: 'SUV',
              slug: 'suv',
              children: [],
            },
          ],
        },
      ],
    },
  })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOneWithChildrens(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update category by id' })
  @ApiParam({ name: 'id', description: 'Category id (UUID)' })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiOkResponse({
    description: 'Category updated successfully',
    schema: {
      example: null,
      nullable: true,
    },
  })
  @ApiNotFoundResponse({ description: 'Category or parent category not found' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }
}
