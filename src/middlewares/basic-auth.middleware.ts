import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { promisify } from 'node:util';

import { Injectable, NestMiddleware, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BasicAuthMiddleware implements NestMiddleware {
    private readonly username: string;
    private readonly password: string;
    private readonly passwordHash: string;
    private readonly salt: Buffer;
    private readonly scryptAsync = promisify(scrypt);

    constructor(@Optional() private readonly configService?: ConfigService) {
        this.username = (this.configService?.get<string>('MQ_USER')) ?? process.env.MQ_USER ?? '';
        this.password = (this.configService?.get<string>('MQ_PASS')) ?? process.env.MQ_PASS ?? '';
        this.salt = randomBytes(16);
        this.passwordHash = this.hashPassword(this.password);
    }

    private hashPassword(password: string): string {
        const hash = scryptSync(password, this.salt, 64).toString('hex');
        return `${this.salt.toString('hex')}:${hash}`;
    }

    async use(req: Request, res: Response, next: NextFunction): Promise<void> {
        const authHeader = req.get('authorization');

        if (!authHeader?.startsWith('Basic ')) {
            this.sendUnauthorizedResponse(res);
            return;
        }

        const encodedCreds = authHeader.split(' ')[1];
        const decodedCreds = Buffer.from(encodedCreds, 'base64').toString('utf-8');
        const [username, password] = decodedCreds.split(':');

        if (!this.username || !this.passwordHash || username !== this.username) {
            this.sendUnauthorizedResponse(res);
            return;
        }

        const isPasswordValid = await this.verifyPassword(password);

        if (!isPasswordValid) {
            this.sendUnauthorizedResponse(res);
            return;
        }

        next();
    }

    private async verifyPassword(password: string): Promise<boolean> {
        const [saltHex, storedHash] = this.passwordHash.split(':');
        const salt = Buffer.from(saltHex, 'hex');

        const hash = (await this.scryptAsync(password, salt, 64)) as Buffer;
        return timingSafeEqual(Buffer.from(storedHash), Buffer.from(hash.toString('hex')));
    }

    private sendUnauthorizedResponse(res: Response): void {
        res.setHeader('WWW-Authenticate', 'Basic realm="Restricted Area", charset="UTF-8"');
        res.sendStatus(401);
    }
}
