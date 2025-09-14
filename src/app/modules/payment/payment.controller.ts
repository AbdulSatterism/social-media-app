// ///webhook

// import { Request, Response } from 'express';

// import stripe from './utils';
// import config from '../../../config';
// import sendResponse from '../../../shared/sendResponse';
// import { StatusCodes } from 'http-status-codes';
// import catchAsync from '../../../shared/catchAsync';

// const createCheckoutSessionController = async (req: Request, res: Response) => {
//   const userId: string = req.user.id;
//   const email: string = req.user.email;

//   const { appointmentId } = req.body;

//   try {
//     const sessionUrl = await PaymentService.createCheckoutSessionService(
//       userId,
//       email,
//       appointmentId,
//     );
//     res.status(200).json({ url: sessionUrl });
//   } catch (error) {
//     console.error('Error creating Stripe checkout session:', error);
//     res.status(500).json({ message: 'Failed to create checkout session' });
//   }
// };

// const paymentStripeWebhookController = async (req: Request, res: Response) => {
//   const sig = req.headers['stripe-signature'];

//   try {
//     const event = stripe.webhooks.constructEvent(
//       req.body,
//       sig as string,
//       config.payment.stripe_webhook_secret as string,
//     );

//     await PaymentService.handleStripeWebhookService(event);

//     res.status(200).send({ received: true });
//   } catch (err) {
//     console.error('Error in Stripe webhook');
//     res.status(400).send(`Webhook Error:`);
//   }
// };

// //* get all payment and calculate total price
// const allPayment = catchAsync(async (req, res) => {
//   const result = await PaymentService.getAllPayment(req.query);

//   sendResponse(res, {
//     success: true,
//     statusCode: StatusCodes.OK,
//     message: 'all payment retrive successfully',
//     data: result,
//   });
// });

// //*by admin
// const getSinglePaymentDetails = catchAsync(async (req, res) => {
//   const result = await PaymentService.getSinglePaymentDetails(req?.params?.id);

//   sendResponse(res, {
//     success: true,
//     statusCode: StatusCodes.OK,
//     message: 'single payment retrive successfully',
//     data: result,
//   });
// });

// const specificUserPayments = catchAsync(async (req, res) => {
//   const result = await PaymentService.specificUserPayments(req.user.id);

//   sendResponse(res, {
//     success: true,
//     statusCode: StatusCodes.OK,
//     message: 'user all payments successfully',
//     data: result,
//   });
// });

// export const paymentControllers = {
//   createCheckoutSessionController,
//   paymentStripeWebhookController,
//   allPayment,
//   getSinglePaymentDetails,
//   specificUserPayments,
// };
