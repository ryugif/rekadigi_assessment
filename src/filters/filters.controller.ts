import { Controller, Get, Param } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';

@Controller('filters')
export class FiltersController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.getAvailableCategoryFacets();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.getAvailableCategoryFacetsByCategoryId(id);
  }
}
