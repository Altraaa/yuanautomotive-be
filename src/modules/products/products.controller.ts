import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BulkDeleteDto } from '../../common/dto/bulk-delete.dto';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import {
  ADMIN_PRODUCTS_PER_PAGE,
  ProductQueryDto,
  PUBLIC_PRODUCTS_PER_PAGE,
} from './dto/product-query.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // ── PUBLIC + ADMIN (same path, shape depends on auth) ─
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(
    @Query() query: ProductQueryDto,
    @Query('limit') rawLimit: string | undefined,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    // Authenticated admins get the manage-table rows (incl. drafts); anonymous
    // visitors get published product cards. Page size defaults per context
    // (admin 20 / public 10) unless the FE sent an explicit ?limit=.
    if (rawLimit === undefined) {
      query.limit = user ? ADMIN_PRODUCTS_PER_PAGE : PUBLIC_PRODUCTS_PER_PAGE;
    }
    return user
      ? this.products.adminList(query)
      : this.products.listPublic(query);
  }

  @Public()
  @Get('slug/:slug')
  detailBySlug(@Param('slug') slug: string) {
    return this.products.detailBySlug(slug);
  }

  // ── ADMIN ─────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('bulk/delete')
  @HttpCode(HttpStatus.OK)
  bulkDelete(@Body() dto: BulkDeleteDto) {
    return this.products.bulkDelete(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser('uuid') authorUuid: string,
  ) {
    return this.products.create(dto, authorUuid);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':uuid')
  adminDetail(@Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string) {
    return this.products.adminDetail(uuid);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':uuid')
  update(
    @Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser('uuid') authorUuid: string,
  ) {
    return this.products.update(uuid, dto, authorUuid);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':uuid')
  remove(@Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string) {
    return this.products.remove(uuid);
  }
}
