import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ApiModule } from '../api/api.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { VersioningType } from '@nestjs/common';
import { writeFileSync } from 'fs';

@Module({ imports: [ApiModule] })
class OpenApiModule {}

async function exportOpenApi() {
  // Create a trimmed application that only imports API controllers (avoids DB/connectors)
  const app = await NestFactory.create(OpenApiModule, { logger: false });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const config = new DocumentBuilder()
    .setTitle('Kimai Backend API')
    .setDescription('API for Kimai aggregator')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  writeFileSync('openapi.json', JSON.stringify(document, null, 2));
  console.log('Wrote openapi.json');
  await app.close();
}

exportOpenApi().catch((err) => {
  console.error(err);
  process.exit(1);
});
