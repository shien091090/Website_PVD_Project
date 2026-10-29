import { verifyAccess } from '../../lib/access.js';
import { fail } from '../../lib/http.js';

export async function onRequest(ctx) {
  const email = await verifyAccess(ctx.request, ctx.env);
  if (!email) return fail(401, 'unauthorized');
  ctx.data.admin = email;
  return ctx.next();
}
