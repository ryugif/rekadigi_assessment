import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string | undefined;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  @Matches(/^[a-zA-Z]+$/, {
    message:
      'slug must contain only characters, no spaces, numbers, or special characters',
  })
  slug: string | undefined;

  @IsOptional()
  @IsString()
  parent_id?: string | null;
}
