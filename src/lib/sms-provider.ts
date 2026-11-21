import "server-only";

export interface SmsProvider {
  sendCode(phone: string, code: string): Promise<void>;
}

export class DevSmsProvider implements SmsProvider {
  async sendCode(phone: string, code: string): Promise<void> {
    if (process.env.NODE_ENV === "development") {
      console.info(`[DEV SMS] ${phone}: код ${code}`);
    }
  }
}

export function getSmsProvider(): SmsProvider {
  return new DevSmsProvider();
}
