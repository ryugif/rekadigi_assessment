import type { INestApplication } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../src/app.factory';

let appPromise: Promise<INestApplication> | null = null;

async function getApp(): Promise<INestApplication> {
  if (appPromise === null) {
    appPromise = createApp().then(async (app) => {
      await app.init();
      return app;
    });
  }

  return appPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const app = await getApp();
  const expressApp = app.getHttpAdapter().getInstance();

  return expressApp(req, res);
}
