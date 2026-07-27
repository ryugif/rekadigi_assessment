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

export class ImageDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  readonly url: string | undefined;

  @IsNumber()
  @IsNotEmpty()
  readonly sort_order: number | undefined;

  @IsBoolean()
  @IsNotEmpty()
  is_primary: boolean | undefined;
}

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string | undefined;

  @IsString()
  @IsNotEmpty()
  readonly make: string | undefined;

  @IsString()
  @IsNotEmpty()
  readonly model: string | undefined;

  @IsString()
  @IsNotEmpty()
  readonly manufacturer: string | undefined;

  @IsNumber()
  @IsNotEmpty()
  readonly year: number | undefined;

  @IsNumber()
  @IsNotEmpty()
  readonly price: number | undefined;

  @IsString()
  @IsNotEmpty()
  readonly color: string | undefined;

  @IsString()
  @IsNotEmpty()
  readonly registrationNumber: string | undefined;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  readonly categoryId: string | undefined;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  readonly images: ImageDto[] | undefined;
}
