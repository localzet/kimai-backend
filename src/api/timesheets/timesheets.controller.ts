import { Controller, Get, Post, UseGuards, Req, Query, Param, Body, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from '../../auth/jwt.guard';

@Controller('timesheets')
export class TimesheetsController {
  constructor(private prisma: PrismaService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Req() req: any, @Query() query: any) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const limit = Math.min(parseInt(query.limit) || 100, 1000);
    const offset = parseInt(query.offset) || 0;
    const where: any = { userId };
    if (query.start_date) where.begin = { gte: new Date(query.start_date) };
    if (query.end_date) where.begin = { ...(where.begin || {}), lte: new Date(query.end_date) };

    const timesheets = await this.prisma.timesheet.findMany({ where, orderBy: { begin: 'desc' }, take: limit, skip: offset });
    const total = await this.prisma.timesheet.count({ where: { userId } });
    return { timesheets, total };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const t = await this.prisma.timesheet.findFirst({ where: { id, userId } });
    return t;
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const id = body.id ?? undefined;
    const now = new Date();
    const ts = await this.prisma.timesheet.create({ data: {
      userId,
      kimaiId: body.kimai_id ?? null,
      begin: new Date(body.begin),
      end: body.end ? new Date(body.end) : null,
      duration: body.duration ?? null,
      projectId: body.project_id ?? null,
      projectName: body.project_name ?? null,
      activityId: body.activity_id ?? null,
      activityName: body.activity_name ?? null,
      description: body.description ?? null,
      tags: body.tags ?? [],
      metaFields: body.meta_fields ?? null,
    }});
    return ts;
  }
}
