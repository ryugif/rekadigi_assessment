import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CategoriesService } from '../categories/categories.service';

@ApiTags('Filters')
@Controller('filters')
export class FiltersController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get category facets for all root categories' })
  @ApiOkResponse({
    description: 'Category facet tree with available listing counts',
    schema: {
      example: [
        {
          id: '39f5dd74-e14b-4ad8-a2f5-3da4d5f17915',
          name: 'Cars',
          slug: 'cars',
          count: 120,
          children: [
            {
              id: '9b8d4737-5f3e-4ec8-b74d-4d55431f9bb4',
              name: 'SUV',
              slug: 'suv',
              count: 45,
              children: [],
            },
          ],
        },
      ],
    },
  })
  findAll() {
    return this.categoriesService.getAvailableCategoryFacets();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category facets within a category subtree' })
  @ApiParam({ name: 'id', description: 'Category id (UUID)' })
  @ApiOkResponse({
    description: 'Category facet subtree with available listing counts',
    schema: {
      example: [
        {
          id: '9b8d4737-5f3e-4ec8-b74d-4d55431f9bb4',
          name: 'SUV',
          slug: 'suv',
          count: 45,
          children: [],
        },
      ],
    },
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.getAvailableCategoryFacetsByCategoryId(id);
  }
}
