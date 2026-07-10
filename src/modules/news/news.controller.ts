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
import { CreateNewsDto, UpdateNewsDto } from './dto/news.dto';
import { NewsQueryDto } from './dto/news-query.dto';
import { NewsService } from './news.service';

@ApiTags('news')
@Controller('news')
export class NewsController {
  constructor(private readonly news: NewsService) {}

  // ── PUBLIC + ADMIN (same path, shape depends on auth) ─
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(@Query() query: NewsQueryDto, @CurrentUser() user?: AuthenticatedUser) {
    // Authenticated admins get manage-table rows (incl. drafts); anonymous
    // visitors get published cards ordered by published_at desc.
    return user
      ? this.news.adminList(query)
      : this.news.listPublic(query);
  }

  @Public()
  @Get('slug/:slug')
  detailBySlug(@Param('slug') slug: string) {
    return this.news.detailBySlug(slug);
  }

  // ── ADMIN ─────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('bulk/delete')
  @HttpCode(HttpStatus.OK)
  bulkDelete(@Body() dto: BulkDeleteDto) {
    return this.news.bulkDelete(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@Body() dto: CreateNewsDto) {
    return this.news.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get(':uuid')
  adminDetail(@Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string) {
    return this.news.adminDetail(uuid);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':uuid')
  update(
    @Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string,
    @Body() dto: UpdateNewsDto,
  ) {
    return this.news.update(uuid, dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':uuid')
  remove(@Param('uuid', new ParseUUIDPipe({ version: '4' })) uuid: string) {
    return this.news.remove(uuid);
  }
}
