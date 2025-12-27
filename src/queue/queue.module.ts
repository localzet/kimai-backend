import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { MlModule } from '../ml/ml.module';

@Module({
  imports: [MlModule],
  providers: [QueueService],
  exports: [QueueService]
})
export class QueueModule {}
