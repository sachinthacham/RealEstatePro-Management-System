import { Request, Response } from 'express';
import Stripe from 'stripe';
import User from '../models/User.model';
import StripeWebhookEvent from '../models/stripeWebhookEvent.model';
import { SUBSCRIPTION_PLANS, PlanType } from '../constants/plans';
import logger from '../utils/logger';
import { getStripeClient } from '../utils/stripeClient';

// NOTE: Webhooks require the RAW request body, not JSON parsed.
// You might need to adjust your app.use(express.json()) middleware in app.ts to ignore this route.

const handleStripeWebhook = async (req: Request, res: Response) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    logger.warn('Received Stripe webhook but STRIPE_WEBHOOK_SECRET is not configured.');
    return res.status(503).json({ received: false, message: 'Stripe webhooks are not configured.' });
  }

  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    // Verify the event came from Stripe
    event = getStripeClient().webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency: safely ignore duplicate webhook deliveries.
  const alreadyProcessed = await StripeWebhookEvent.exists({ eventId: event.id });
  if (alreadyProcessed) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  // Handle the "Checkout Session Completed" event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Retrieve custom data we sent earlier
    const userId = session.metadata?.userId;
    const planType = session.metadata?.planType as PlanType | undefined;

    if (userId && planType && SUBSCRIPTION_PLANS[planType]) {
      logger.info(`Payment successful for User: ${userId}, Plan: ${planType}`);

      // UPGRADE THE USER IN DB
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);

      await User.findByIdAndUpdate(userId, {
        subscription: {
          plan: planType,
          startDate: new Date(),
          endDate: nextMonth,
          status: 'active',
          paymentId: session.payment_intent as string,
        }
      });
    } else {
      logger.warn(`Ignoring webhook due to invalid metadata. eventId=${event.id}`);
    }
  }

  await StripeWebhookEvent.create({
    eventId: event.id,
    eventType: event.type,
  });

  res.status(200).json({ received: true });
};

export default { handleStripeWebhook };