import { Module } from '@nestjs/common';
import { KimaiService } from './kimai.service';

@Module({
  providers: [KimaiService],
  exports: [KimaiService],
})
export class KimaiModule {}
