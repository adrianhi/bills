import { PrismaResendEventRepository } from '../infrastructure/prisma-resend-event.repository';
import { ResendWebhookAdapter } from '../providers/resend/resend-webhook.adapter';

const localPart = (address: string) => address.toLowerCase().match(/<?([^<>\s]+)@([^<>\s]+)>?/)?.[1] || '';
export class HandleResendWebhook {
  constructor(private readonly verifier: ResendWebhookAdapter, private readonly events: PrismaResendEventRepository) {}
  async execute(payload: string, headers: { id: string; timestamp: string; signature: string }) {
    const event = this.verifier.verify(payload, headers);
    if (event.type !== 'email.received') return 'ignored' as const;
    const address = await this.events.findAddress((event.data.to || []).map(localPart).filter(Boolean));
    if (!address) return 'ignored' as const;
    return this.events.create({ workspaceId: address.bankConnection.workspaceId, bankConnectionId: address.bankConnectionId, providerEventId: headers.id, providerEmailId: event.data.email_id });
  }
}
