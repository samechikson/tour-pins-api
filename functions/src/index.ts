require("dotenv").config();
import * as functions from "firebase-functions";

export const testFunction = functions.https.onCall(async (data, context) => {
  const uid = context.auth && context.auth.uid;
  const message = data.message;

  return `${uid} sent a message of ${message}`;
});

export { getGolfAdvisorDataById } from "./golf-advisor";
export { getGolfCourseScorecardById } from "./golf-advisor-scorecard";
export { getMapboxVectorDataForCoordinates } from "./mapbox-coordinates";
export { duplicateDocument } from "./copy-collection";

export {
  generateCheckoutLinkForOnePinSheet,
  generateCheckoutLinkForEvent,
  getPaymentIntent,
  getCustomerSubscriptions,
} from "./stripe/index";
export { validatePayment } from "./pinSheet";
