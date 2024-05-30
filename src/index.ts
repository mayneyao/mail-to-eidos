import PostalMime from 'postal-mime';
import { Buffer } from 'buffer';

export default {
	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return new Response('Hello, world!', { status: 200 });
	},
	async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
		const to = message.to;
		/**
		 * <uuid>.<space>[.<tableId>]@eidos.ink
		 */
		const [uuid, space, tableId] = to.split('@')[0].split('.');
		const email = await PostalMime.parse(message.raw);
		/**
		 * 1. not title: create or append content to today's note
		 * 2. title & tableId: create a sub-doc in the table
		 * 3. title & no tableId: create a new doc with the title
		 */
		const hasTitle = Boolean(email.subject?.length);
		const mode = hasTitle ? 'replace' : 'append';
		const docId = hasTitle ? self.crypto.randomUUID().replace(/-/g, '') : new Date().toISOString().split('T')[0];
		const newAttachment = email.attachments.map((attachment) => {
			console.log('attachment', attachment);
			return {
				...attachment,
				content: Buffer.from(attachment.content).toString('base64'),
			};
		});
		await fetch(`https://api.eidos.space/rpc/${uuid}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				space,
				method: 'createOrUpdateDoc',
				params: [
					{
						docId,
						content: {
							...email,
							attachments: newAttachment,
						},
						type: 'email',
						parent_id: tableId,
						title: email.subject,
						mode,
					},
				],
			}),
		});
	},
};
