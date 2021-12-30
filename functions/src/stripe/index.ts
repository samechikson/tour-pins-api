import * as functions from "firebase-functions";
// import Stripe = require("stripe");
import { db, stripe } from "../config";
import { assert, assertUID } from "../helpers";
import { getOrCreateCustomer } from "./customers";

// const lineItemsOptions: Record<
//   string,
//   Stripe.checkouts.sessions.ICheckoutLineItems
// > = {
//   golfEvent: {
//     name: "Tour Pins Golf Event",
//     amount: 5000,
//     currency: "usd",
//     quantity: 1,
//   },
//   singlePinSheet: {
//     amount: 2000,
//     currency: "usd",
//     name: "One pin location sheet",
//     quantity: 1,
//   },
// };

export const generateCheckoutLinkForOnePinSheet = functions.https.onCall(
  async (data, context) => {
    const uid = assertUID(context);
    const successUrl = assert(data, "successUrl");
    const cancelUrl = assert(data, "cancelUrl");
    const pinSheetId = assert(data, "pinSheetId");
    const eventName = assert(data.pinSheet, "eventName");
    const header = assert(data.pinSheet, "header");

    const stripeCustomer = await getOrCreateCustomer(uid);

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      line_items: [
        {
          amount: 2000,
          currency: "usd",
          name: `Tour Pins - ${eventName} - ${header}`,
          quantity: 1,
        },
      ],
      payment_method_types: ["card"],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await stripe.paymentIntents.update(session.payment_intent as string, {
      metadata: {
        firebaseUserUid: uid,
        pinSheetId,
        pinSheetEventName: eventName,
        pinSheetHeader: header,
      },
    });

    await db
      .collection("pinSheets")
      .doc(pinSheetId)
      .set(
        {
          paymentIntentId: session.payment_intent,
          belongsTo: [uid],
        },
        { merge: true }
      );

    return session;
  }
);

export const generateCheckoutLinkForEvent = functions.https.onCall(
  async (data, context) => {
    const uid = assertUID(context);
    const successUrl = assert(data, "successUrl");
    const cancelUrl = assert(data, "cancelUrl");
    const golfEventId = assert(data, "golfEventId");
    const eventName = assert(data.golfEvent, "name");

    const stripeCustomer = await getOrCreateCustomer(uid);

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer.id,
      line_items: [
        {
          amount: 5000,
          currency: "usd",
          name: `Tour Pins Event- ${eventName}`,
          quantity: 1,
        },
      ],
      payment_method_types: ["card"],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    await stripe.paymentIntents.update(session.payment_intent as string, {
      metadata: {
        firebaseUserUid: uid,
        golfEventId,
        golfEventName: eventName,
      },
    });

    await db
      .collection("golfEvents")
      .doc(golfEventId)
      .set(
        {
          paymentIntentId: session.payment_intent,
          belongsTo: [uid],
        },
        { merge: true }
      );

    return session;
  }
);
