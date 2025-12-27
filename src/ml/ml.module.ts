import { Module } from '@nestjs/common';
import { MlService } from './ml.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MlService],
  exports: [MlService],
})
export class MlModule {}
