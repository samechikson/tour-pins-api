import { fun } from './test-config';
fun.cleanup;

import {createCustomer, getOrCreateCustomer, getUser} from '../src/customers';
import {mockUser} from "./mocks";

let user: any;

beforeAll( async () => {
  user = await mockUser();
  await createCustomer(user.uid);
});

test('getOrCreateCustomer creates/retrieves a Stripe Customer', async () => {
  const cust = await getOrCreateCustomer(user.uid);

  expect(cust.id).toContain('cus_');
  expect(cust.metadata.firebaseUID).toEqual(user.uid);

  const userDoc = await getUser(user.uid);

  expect(userDoc.stripeCustomerId).toContain('cus_');
});