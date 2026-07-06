import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Sparepart' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
