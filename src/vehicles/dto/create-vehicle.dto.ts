import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsString,
  IsUrl,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImageDto {
  @ApiProperty({
    example: 'https://cdn.example.com/listings/civic-front.jpg',
    description: 'Absolute image URL',
  })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  readonly url: string | undefined;

  @ApiProperty({
    example: 1,
    description: 'Sort priority. Lower number appears first',
  })
  @IsNumber()
  @IsNotEmpty()
  readonly sort_order: number | undefined;

  @ApiProperty({
    example: true,
    description: 'Marks this image as the primary image',
  })
  @IsBoolean()
  @IsNotEmpty()
  is_primary: boolean | undefined;
}

export class CreateVehicleDto {
  @ApiProperty({ example: 'Honda Civic RS 2022' })
  @IsString()
  @IsNotEmpty()
  readonly name: string | undefined;

  @ApiProperty({ example: 'Honda' })
  @IsString()
  @IsNotEmpty()
  readonly make: string | undefined;

  @ApiProperty({ example: 'Civic RS' })
  @IsString()
  @IsNotEmpty()
  readonly model: string | undefined;

  @ApiProperty({ example: 'Honda Prospect Motor' })
  @IsString()
  @IsNotEmpty()
  readonly manufacturer: string | undefined;

  @ApiProperty({ example: 2022 })
  @IsNumber()
  @IsNotEmpty()
  readonly year: number | undefined;

  @ApiProperty({ example: 385000000 })
  @IsNumber()
  @IsNotEmpty()
  readonly price: number | undefined;

  @ApiProperty({ example: 'White' })
  @IsString()
  @IsNotEmpty()
  readonly color: string | undefined;

  @ApiProperty({ example: 'B1234XYZ' })
  @IsString()
  @IsNotEmpty()
  readonly registrationNumber: string | undefined;

  @ApiProperty({ example: '39f5dd74-e14b-4ad8-a2f5-3da4d5f17915' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  readonly categoryId: string | undefined;

  @ApiProperty({ type: () => [ImageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  readonly images: ImageDto[] | undefined;
}
