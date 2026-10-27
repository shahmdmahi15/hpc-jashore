import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAccessAuthGuard } from '../auth/jwt.guard';
import { extractClientIp } from '../common/request-ip';
import { CurrentUser, type RequestUser } from '../rbac/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { ChatService } from './chat.service';
import { GetMessagesQueryDto, SearchMentionsQueryDto, SendMessageDto } from './dto';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAccessAuthGuard, RolesGuard)
@Roles('admin', 'doctor', 'handler', 'therapist', 'cashier', 'receptionist')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  private meta(req: Request) {
    return {
      ip: extractClientIp(req),
      requestId: ((req as unknown as { requestId?: string }).requestId ?? null) as string | null,
    };
  }

  @Get('messages')
  @ApiOperation({ summary: 'List chat messages for a specific date (defaults to today)' })
  listMessages(@Query() query: GetMessagesQueryDto) {
    return this.chatService.listMessagesByDate(query.date);
  }

  @Get('dates')
  @ApiOperation({ summary: 'Get available dates with chat history (latest 30 days)' })
  getAvailableDates() {
    return this.chatService.getAvailableDates();
  }

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a clinical or realtime clinic chat message' })
  sendMessage(
    @CurrentUser() user: RequestUser,
    @Body() dto: SendMessageDto,
    @Req() req: Request,
  ) {
    return this.chatService.sendMessage(
      { sub: user.sub, role: user.role },
      dto,
      this.meta(req),
    );
  }

  @Get('search-mentions')
  @ApiOperation({ summary: 'Search staff or patients for autocomplete mentions' })
  @ApiQuery({ name: 'type', enum: ['patient', 'user'] })
  @ApiQuery({ name: 'q', required: false })
  searchMentions(@Query() query: SearchMentionsQueryDto) {
    return this.chatService.searchMentions(query.type, query.q || '');
  }
}
