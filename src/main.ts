import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
import { VersioningType, Logger } from '@nestjs/common';
import { ZodValidationPipe } from 'nestjs-zod';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ZodValidationPipe());

  app.disable('x-powered-by');

  app.enableShutdownHooks();
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const config = new DocumentBuilder()
    .setTitle('Kimai Aggregator API')
    // .setDescription('API for Kimai Aggregator')
    .setVersion('1.0')
    // .setTermsOfService('')
    // .setContact('localzet', 'https://github.com/localzet', 'creator@localzet.com')
    // .setLicense('AGPL-3.0', 'https://github.com/localzet/kimai-backend/?tab=AGPL-3.0-1-ov-file')
    .addServer('http://localhost:3001', 'Development')
    .addServer('https://kimai-api.zorin.cloud', 'Production')
    // .setExternalDoc('GitHub', 'https://github.com/localzet/kimai-backend')
    .addBearerAuth(
      {
        type: 'http',
        description: 'JWT obtained login',
        name: 'Authorization',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'Authorization',
    )
    .build();

  const doc = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    autoTagControllers: true,
  });
  const theme = new SwaggerTheme();
  SwaggerModule.setup('docs', app, doc, {
    swaggerUiEnabled: true,
    ui: true,
    raw: ['json'],
    explorer: false,
    customCss: theme.getBuffer(SwaggerThemeNameEnum.DARK),
    customSiteTitle: 'Kimai Aggregator API',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`API listening on http://localhost:${port}`);
  logger.log(`Docs: http://localhost:${port}/docs`);
  logger.log(`Queues: http://localhost:${port}/queues`);
}

bootstrap();
