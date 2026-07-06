import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ContactStatus } from '../../../common/enums';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Mirrors the FE zod schema (features/contact/schema.ts). */
export class CreateContactDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(191)
  name: string;

  @ApiProperty({ example: '0812 3456 7890' })
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @Matches(/^[0-9+\-\s]+$/, {
    message: 'phone may only contain digits, +, -, and spaces',
  })
  phone: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  vehicle_model?: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;
}

export class UpdateContactStatusDto {
  @ApiProperty({ enum: ContactStatus })
  @IsEnum(ContactStatus)
  status: ContactStatus;
}

export class ContactQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ContactStatus })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;
}
