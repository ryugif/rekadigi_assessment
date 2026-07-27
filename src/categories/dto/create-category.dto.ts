import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'SUV',
    minLength: 3,
    maxLength: 200,
    description: 'Category display name',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string | undefined;

  @ApiProperty({
    example: 'suv',
    minLength: 3,
    maxLength: 200,
    description: 'Unique slug using letters only',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @Matches(/^[a-zA-Z]+$/, {
    message:
      'slug must contain only characters, no spaces, numbers, or special characters',
  })
  slug: string | undefined;

  @ApiPropertyOptional({
    example: '39f5dd74-e14b-4ad8-a2f5-3da4d5f17915',
    nullable: true,
    description: 'Parent category id for nested category structure',
  })
  @IsOptional()
  @IsString()
  parent_id?: string | null;
}
