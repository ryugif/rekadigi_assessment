import { PartialType } from '@nestjs/mapped-types';
import { CreateCategoryDto } from './create-category.dto';

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
