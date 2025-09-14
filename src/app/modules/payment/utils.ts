import Stripe from 'stripe';
import config from '../../../config';

// Initialize Stripe client with secret key
const stripe = new Stripe(config.stripe_api_secret as string, {
  apiVersion: '2025-01-27.acacia',
});

export default stripe;
