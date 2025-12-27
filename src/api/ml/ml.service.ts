import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { inferGrpc } from './grpc-client';

@Injectable()
export class MlService {
  constructor(private readonly prisma: PrismaService) {}

  async infer(userId: string, payload: { timesheets?: any[]; weeks?: any[]; settings?: any; options?: Record<string,string>; kind?: string }) {
    const req = { user_id: userId, timesheets: payload.timesheets, weeks: payload.weeks, settings: payload.settings, options: payload.options, kind: payload.kind };
    const res = await inferGrpc(req);
    const parsed = JSON.parse(res.result_json || '{}');
    try {
      await this.prisma.mlResult.create({ data: { userId, kind: payload.kind || 'inference', payload: parsed } as any });
    } catch (e) {
      // persist failure should not break inference call
    }
    return parsed;
  }

  async getConfigs() {
    return this.prisma.mlConfig.findMany();
  }

  async upsertConfig(key: string, value: any) {
    return this.prisma.mlConfig.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}

export default MlService;
