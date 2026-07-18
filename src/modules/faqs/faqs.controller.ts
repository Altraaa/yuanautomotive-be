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
import { applyContextLimit } from '../../common/dto/pagination-query.dto';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';
import { FaqQueryDto } from './dto/faq-query.dto';
import { FaqsService } from './faqs.service';

@ApiTags('faqs')
@Controller('faqs')
export class FaqsController {
  constructor(private readonly faqs: FaqsService) {}

  // ── PUBLIC + ADMIN (same path, shape depends on auth) ─
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(
    @Query() query: FaqQueryDto,
    @Query('limit') rawLimit: string | undefined,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    // Authenticated admins get manage-table rows (incl. unpublished); anonymous
    // visitors get published items ordered by sort_order asc. Page size defaults
    // per context (admin 25 / public 10) unless FE sent ?limit=.
    applyContextLimit(query, rawLimit, !!user);
    return user ? this.faqs.adminList(query) : this.faqs.listPublic(query);
  }

  // ── ADMIN ─────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('bulk/delete')
  @HttpCode(HttpStatus.OK)
  bulkDelete(@Body() dto: BulkDeleteDto) {
    return this.faqs.bulkDelete(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateFaqDto) {
    return this.faqs.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':uuid')
  adminDetail(@Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string) {
    return this.faqs.adminDetail(uuid);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':uuid')
  update(
    @Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string,
    @Body() dto: UpdateFaqDto,
  ) {
    return this.faqs.update(uuid, dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':uuid')
  remove(@Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string) {
    return this.faqs.remove(uuid);
  }
}
