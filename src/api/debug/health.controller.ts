import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return { ok: true, time: new Date().toISOString() };
  }
}

export default HealthController;
