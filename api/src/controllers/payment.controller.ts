import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { SUBSCRIPTION_PLANS, PlanType } from "../constants/plans";
import { getStripeClient } from "../utils/stripeClient";
import { AppError } from "../utils/appError";

const createCheckoutSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { plan } = req.body; // 'BUSINESS' or 'PREMIUM'
    const user = req.user!;

    // 1. Get Plan Details
    const selectedPlan = SUBSCRIPTION_PLANS[plan as PlanType];
    if (!selectedPlan) throw new AppError("Invalid plan selected", 400);

    // 2. Create Stripe Session
    let stripe;
    try {
      stripe = getStripeClient();
    } catch {
      throw new AppError("Payments are not configured on this server yet.", 503);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "lkr",
            product_data: {
              name: `${selectedPlan.name} Membership`,
              description: `Access to ${selectedPlan.maxListings} listings`,
            },
            unit_amount: selectedPlan.price * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
      customer_email: user.email,
      metadata: {
        userId: user._id.toString(),
        planType: plan,
      },
    });

    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (error) {
    next(error);
  }
};

export default { createCheckoutSession };
