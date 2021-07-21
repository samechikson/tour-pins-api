// import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Initialize cloud firestore
export const db = admin.firestore();
const settings = { timestampsInSnapshots: true };
db.settings(settings);

// ENV variables
// export const stripeSecret = functions.config().stripe.secret;

// import * as Stripe from 'stripe';
// export const stripe = new Stripe(stripeSecret);
