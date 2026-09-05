import { Router } from 'express';
import { z } from 'zod';
import { contactLimiter } from '@/middlewares/rateLimiter';
import { validate } from '@/middlewares/validate';
import { asyncHandler } from '@/utils/asyncHandler';
import { ok } from '@/utils/ApiResponse';
import { sendEmail } from '@/utils/email';
import { getSettings } from '@/api/settings/settings.repository';
import { nameField, phoneField } from '@/utils/zodHelpers';

const router = Router();

const contactSchema = z.object({
  name: nameField(2, 120),
  email: z.string().email().max(180),
  phone: phoneField().optional(),
  message: z.string().min(10).max(2000),
});

// Public — the marketing site's Contact page. Delivers straight to the
// salon's own inbox (no ticketing system in this app); rate-limited since
// it's the one unauthenticated form that triggers an email send.
router.post(
  '/',
  contactLimiter,
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const { name, email, phone, message } = req.body as z.infer<typeof contactSchema>;
    const settings = await getSettings();
    const to = settings.email || undefined;

    if (to) {
      await sendEmail({
        to,
        subject: `New contact message from ${name}`,
        text: `From: ${name} <${email}>${phone ? ` · ${phone}` : ''}\n\n${message}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #d63384;">New message from the website</h2>
            <p><b>Name:</b> ${name}</p>
            <p><b>Email:</b> ${email}</p>
            ${phone ? `<p><b>Phone:</b> ${phone}</p>` : ''}
            <p style="margin-top:16px; white-space: pre-wrap;">${message}</p>
          </div>
        `,
      });
    }

    res.status(201).json(ok({ received: true }));
  })
);

export default router;
