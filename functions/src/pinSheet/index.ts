import { db, stripe } from "../config";
import * as functions from "firebase-functions";
import { assert, assertUID, catchErrors } from "../helpers";

const _validatePayment = async (
  pinSheetId: string,
  firebaseUserUid: string
) => {
  const pinSheet = await db.collection("pinSheets").doc(pinSheetId).get();
  const pinSheetData = pinSheet.data();

  if (!pinSheetData.paymentIntentId) {
    throw new Error("No payment intent id found");
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(
    pinSheetData.paymentIntentId
  );

  if (paymentIntent.status !== "succeeded") {
    throw new Error("Payment not succeeded");
  }

  if (paymentIntent.metadata.firebaseUserUid !== firebaseUserUid) {
    throw new Error("Payment not for this user");
  }
};

export const validatePayment = functions.https.onCall(async (data, context) => {
  const pinSheetId: string = assert(data, "pinSheetId");
  const firebaseUserUid: string = assertUID(context);

  return await catchErrors(_validatePayment(pinSheetId, firebaseUserUid));
});
