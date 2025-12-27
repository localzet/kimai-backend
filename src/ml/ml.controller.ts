import { Body, Controller, Get, Post, Put, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { MlService } from './ml.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('api/ml')
export class MlController {
  constructor(private readonly ml: MlService) {}

  @UseGuards(JwtAuthGuard)
  @Get('configs')
  async listConfigs() {
    return this.ml.getConfigs();
  }

  @UseGuards(JwtAuthGuard)
  @Put('configs/:key')
  async upsertConfig(@Req() req: any, @Body() body: any) {
    const key = req.params.key;
    return this.ml.upsertConfig(key, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('infer')
  async infer(@Req() req: any, @Body() body: any) {
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException();
    const since = body.since;
    const until = body.until;
    const kind = body.kind || 'forecasting';
    const options = body.options || {};
    const res = await this.ml.infer(userId, { timesheets: body.timesheets, weeks: body.weeks, settings: body.settings, options, kind });
    return { status: 'ok', result: res };
  }
}
