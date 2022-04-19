import { db, stripe } from "../config";
import * as functions from "firebase-functions";
import { assert, assertUID, catchErrors } from "../helpers";
import { customerHasValidSubscription } from "../stripe/customers";

const validatePinSheetIsPaid = async (
  pinSheetId: string,
  firebaseUserUid: string
) => {
  const pinSheet = await db.collection("pinSheets").doc(pinSheetId).get();
  const pinSheetData = pinSheet.data();

  if (!pinSheetData.paymentIntentId) {
    throw new functions.https.HttpsError(
      "not-found",
      "This pin sheet has not been paid for yet.",
      {
        id: "PAYMENT_NOT_SUCCESSFUL",
      }
    );
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(
    pinSheetData.paymentIntentId
  );

  if (paymentIntent.status !== "succeeded") {
    throw new functions.https.HttpsError(
      "not-found",
      "This pin sheet has not been paid for yet.",
      {
        id: "PAYMENT_NOT_SUCCESSFUL",
      }
    );
  }

  if (paymentIntent.metadata.firebaseUserUid !== firebaseUserUid) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "This pin sheet does not belong to you.",
      {
        id: "PERMISSION_DENIED",
      }
    );
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
    throw new functions.https.HttpsError(
      "failed-precondition",
      "This pin sheet is not for this event.",
      {
        id: "PIN_SHEET_NOT_IN_EVENT",
      }
    );
  }

  if (!golfEvent.paymentIntentId) {
    throw new functions.https.HttpsError(
      "not-found",
      "This event has not been paid for yet.",
      {
        id: "EVENT_PAYMENT_NOT_SUCCESSFUL",
      }
    );
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(
    golfEvent.paymentIntentId
  );

  if (paymentIntent.status !== "succeeded") {
    throw new functions.https.HttpsError(
      "not-found",
      "This event has not been paid for yet.",
      {
        id: "EVENT_PAYMENT_NOT_SUCCESSFUL",
      }
    );
  }

  if (paymentIntent.metadata.firebaseUserUid !== firebaseUserUid) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "This event does not belong to you.",
      {
        id: "PERMISSION_DENIED",
      }
    );
  }
};

export const validatePayment = functions.https.onCall(async (data, context) => {
  const pinSheetId: string = assert(data, "pinSheetId");
  const golfEventId: string = data.golfEventId;
  const firebaseUserUid: string = assertUID(context);

  // If user has a subscription, they can download the pin sheet
  if (await customerHasValidSubscription(firebaseUserUid)) {
    return {
      message:
        "Success: You have a subscription, you can download the pin sheet.",
    };
  }

  if (golfEventId) {
    return await catchErrors(
      validatePinSheetIsInPaidEvent(pinSheetId, golfEventId, firebaseUserUid)
    );
  }

  return await catchErrors(validatePinSheetIsPaid(pinSheetId, firebaseUserUid));
});
