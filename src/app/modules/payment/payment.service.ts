// /* eslint-disable no-console */
// import Stripe from 'stripe';
// import stripe from './utils';
// import { Payment } from './payment.model';
// import { Types } from 'mongoose';

// import { StatusCodes } from 'http-status-codes';
// import { User } from '../user/user.model';

// const createCheckoutSessionService = async (
//   userId: string,
//   email: string,
//   appointmentId: string,
// ) => {
//   const isExistBookAppointment = await BookAppointment.findById(appointmentId);

//   console.log(isExistBookAppointment);

//   if (!isExistBookAppointment) {
//     throw new AppError(
//       StatusCodes.BAD_GATEWAY,
//       'Book-Appointment is not found!',
//     );
//   }

//   try {
//     const lineItems = [
//       {
//         price_data: {
//           currency: 'usd',
//           product_data: {
//             name: 'Appointment Payment',
//             description: `Payment for appointment`,
//           },
//           unit_amount: isExistBookAppointment?.paymentAmount * 100,
//         },
//         quantity: 1,
//       },
//     ];

//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       line_items: lineItems,
//       mode: 'payment',
//       success_url:
//         'https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}',
//       // success_url: 'http://192.168.10.33:3000',
//       cancel_url: 'https://yourapp.com/cancel',
//       metadata: {
//         userId,
//         appointmentId,
//       },
//       customer_email: email,
//     });

//     return session.url;
//   } catch (error) {
//     console.error('Stripe session creation failed:', error);
//     throw new Error('Failed to create checkout session');
//   }
// };

// const handleStripeWebhookService = async (event: Stripe.Event) => {
//   switch (event.type) {
//     case 'checkout.session.completed': {
//       const session = event.data.object as Stripe.Checkout.Session;

//       const { amount_total, metadata, payment_intent } = session;
//       const userId = metadata?.userId as string; // Ensure you pass metadata when creating a checkout session

//       const amountTotal = (amount_total ?? 0) / 100;

//       const isAppointment = session?.metadata?.appointmentId;

//       const paymentRecord = new Payment({
//         appointmentPrice: amountTotal, // Convert from cents to currency
//         userId: new Types.ObjectId(userId),
//         appointmentId: isAppointment,
//         transactionId: payment_intent,
//         status: 'COMPLETED',
//       });
//       await paymentRecord.save();

//       //* update book appointemtn status
//       await BookAppointment.findByIdAndUpdate(
//         isAppointment,
//         { paymentStatus: 'COMPLETED' },
//         { new: true },
//       );

//       break;
//     }

//     case 'checkout.session.async_payment_failed': {
//       const session = event.data.object as Stripe.Checkout.Session;
//       const { client_secret } = session;
//       const payment = await Payment.findOne({ client_secret });
//       if (payment) {
//         payment.status = 'FAILED';
//         await payment.save();
//       }
//       //* update book appointemtn status if failed
//       await BookAppointment.findByIdAndUpdate(
//         payment?.appointmentId,
//         { paymentStatus: 'FAILED' },
//         { new: true },
//       );

//       break;
//     }

//     default:
//       console.log(`Unhandled event type ${event.type}`);
//   }
// };

// // const getAllPayment = async () => {
// //   const result = await Payment.aggregate([
// //     {
// //       $match: { status: 'COMPLETED' }, // Filter only completed payments
// //     },
// //     {
// //       $lookup: {
// //         from: 'users', // The name of the User collection in MongoDB
// //         localField: 'userId',
// //         foreignField: '_id',
// //         as: 'user',
// //       },
// //     },
// //     {
// //       $unwind: {
// //         path: '$user',
// //         preserveNullAndEmptyArrays: true, // In case a user is missing
// //       },
// //     },
// //     {
// //       $group: {
// //         _id: null, // Group all documents to compute the subtotal
// //         totalAppointmentPrice: { $sum: '$appointmentPrice' }, // Sum up all appointment prices
// //         payments: { $push: '$$ROOT' }, // Push all documents into an array
// //       },
// //     },
// //     {
// //       $project: {
// //         _id: 0, // Hide _id field
// //         subtotal: '$totalAppointmentPrice', // Rename total price as subtotal
// //         payments: {
// //           _id: 1,
// //           // userId: 1,
// //           transactionId: 1,
// //           appointmentPrice: 1,
// //           status: 1,
// //           createdAt: 1,
// //           updatedAt: 1,
// //           user: { _id: 1, name: 1, email: 1 }, // Only include necessary fields from User
// //         },
// //       },
// //     },
// //   ]);

// //   return result.length > 0 ? result[0] : { subtotal: 0, payments: [] };
// // };

// const getAllPayment = async (query: Record<string, unknown>) => {
//   const { page, limit } = query;

//   const pages = parseInt(page as string) || 1;
//   const size = parseInt(limit as string) || 10;
//   const skip = (pages - 1) * size;

//   const result = await Payment.aggregate([
//     {
//       $match: { status: 'COMPLETED' }, // Filter only completed payments
//     },
//     {
//       $lookup: {
//         from: 'users', // The name of the User collection in MongoDB
//         localField: 'userId',
//         foreignField: '_id',
//         as: 'user',
//       },
//     },
//     {
//       $unwind: {
//         path: '$user',
//         preserveNullAndEmptyArrays: true, // In case a user is missing
//       },
//     },
//     {
//       $facet: {
//         metadata: [
//           { $count: 'total' }, // Get the total count of documents
//           { $addFields: { page: pages } },
//         ],
//         data: [
//           { $sort: { createdAt: -1 } }, // Sort by latest createdAt
//           { $skip: skip }, // Skip for pagination
//           { $limit: size }, // Limit the number of results
//           {
//             $project: {
//               _id: 1,
//               transactionId: 1,
//               appointmentPrice: 1,
//               status: 1,
//               createdAt: 1,
//               updatedAt: 1,
//               user: { _id: 1, name: 1, email: 1 }, // Only include necessary fields from User
//             },
//           },
//         ],
//         totalPrice: [
//           {
//             $group: {
//               _id: null,
//               totalAppointmentPrice: { $sum: '$appointmentPrice' },
//             },
//           },
//         ],
//       },
//     },
//   ]);

//   // Extracting values from aggregation result
//   const total = result[0]?.metadata[0]?.total || 0;
//   const totalPrice = result[0]?.totalPrice[0]?.totalAppointmentPrice || 0;
//   const payments = result[0]?.data || [];

//   return {
//     totalPrice, // Total appointment price
//     totalData: total, // Total number of records
//     page: pages,
//     limit: size,
//     payments, // Paginated payments
//   };
// };

// //* by admin
// const getSinglePaymentDetails = async (paymentId: string) => {
//   const payment = await Payment.findById(paymentId).populate({
//     path: 'userId',
//     select: 'name email',
//   });

//   if (!payment) {
//     throw new AppError(StatusCodes.NOT_FOUND, 'payment not found');
//   }

//   const { transactionId } = payment;

//   if (!transactionId) {
//     throw new AppError(StatusCodes.BAD_REQUEST, 'Transaction ID is missing');
//   }

//   ///* Retrieve transaction details from Stripe
//   const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);

//   // Fetch charge details to get card details
//   const charge = await stripe.charges.retrieve(
//     paymentIntent.latest_charge as string,
//   );

//   const transactionDetails = {
//     currency: paymentIntent.currency,
//     status: paymentIntent.status,
//     paymentMethod: paymentIntent.payment_method_types[0],
//     paymentEmail: charge.billing_details.email,
//     paymentName: charge.billing_details.name,
//     brand: charge.payment_method_details?.card?.brand ?? null,
//     last4: charge.payment_method_details?.card?.last4 ?? null,
//   };

//   return {
//     ...payment.toObject(), // Convert Mongoose document to a plain object
//     transactionDetails,
//   };
// };

// //* specific user payments
// const specificUserPayments = async (userId: string) => {
//   //* check user exist or not
//   const isUserExist = await User.findById(userId);

//   if (!isUserExist) {
//     throw new AppError(StatusCodes.NOT_FOUND, 'user not found');
//   }

//   const payment = await Payment.find({ userId: userId });

//   return payment;
// };

// export const PaymentService = {
//   createCheckoutSessionService,
//   handleStripeWebhookService,
//   getAllPayment,
//   getSinglePaymentDetails,
//   specificUserPayments,
// };
