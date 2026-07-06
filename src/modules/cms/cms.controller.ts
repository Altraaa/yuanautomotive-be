import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CmsService } from './cms.service';
import { UpdateCmsDto } from './dto/cms.dto';

@ApiTags('cms')
@Controller('cms')
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  @Public()
  @Get(':key')
  get(@Param('key') key: string) {
    return this.cms.get(key);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Put(':key')
  put(@Param('key') key: string, @Body() dto: UpdateCmsDto) {
    return this.cms.upsert(key, dto);
  }

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':key')
  patch(@Param('key') key: string, @Body() dto: UpdateCmsDto) {
    return this.cms.upsert(key, dto);
  }
}
