import { db, stripe } from "../config";
import * as functions from "firebase-functions";
import { assert, assertUID, catchErrors } from "../helpers";

const validatePinSheetIsPaid = async (
  pinSheetId: string,
  firebaseUserUid: string
) => {
  const pinSheet = await db.collection("pinSheets").doc(pinSheetId).get();
  const pinSheetData = pinSheet.data();

  if (!pinSheetData.paymentIntentId) {
    throw new Error("You have not paid for this pin sheet yet.");
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(
    pinSheetData.paymentIntentId
  );

  if (paymentIntent.status !== "succeeded") {
    throw new Error("Payment for this pin sheet has not been completed.");
  }

  if (paymentIntent.metadata.firebaseUserUid !== firebaseUserUid) {
    throw new Error("This pin sheet does not belong to you.");
  }
};

const validatePinSheetIsInPaidEvent = async (
  pinSheetId: string,
  golfEventId: string,
  firebaseUserUid: string
) => {
  const golfEvent = (
    await db.collection("golfEvents").doc(golfEventId).get()
  ).data();

  if (!golfEvent.pinSheetIds.includes(pinSheetId)) {
    throw new Error("This pin sheet does not belong to this event.");
  }

  if (!golfEvent.paymentIntentId) {
    throw new Error("This event has not been paid for yet.");
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(
    golfEvent.paymentIntentId
  );

  if (paymentIntent.status !== "succeeded") {
    throw new Error("Payment for this event has not been completed.");
  }

  if (paymentIntent.metadata.firebaseUserUid !== firebaseUserUid) {
    throw new Error("This event does not belong to you.");
  }
};

export const validatePayment = functions.https.onCall(async (data, context) => {
  const pinSheetId: string = assert(data, "pinSheetId");
  const golfEventId: string = data.golfEventId;
  const firebaseUserUid: string = assertUID(context);

  if (golfEventId) {
    return await catchErrors(
      validatePinSheetIsInPaidEvent(pinSheetId, golfEventId, firebaseUserUid)
    );
  }

  return await catchErrors(validatePinSheetIsPaid(pinSheetId, firebaseUserUid));
});
