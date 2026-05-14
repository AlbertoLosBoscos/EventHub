import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

export const stripePublicKey = process.env.STRIPE_PUBLISHABLE || '';
const stripeSecretKey = process.env.STRIPE_SECRET || '';

export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-01-28.clover' as any,
});