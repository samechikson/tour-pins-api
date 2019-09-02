import * as TestFunctions from 'firebase-functions-test';

const firebaseConfig = {
  databaseURL: "https://tour-pin-sheets-dev.firebaseio.com",
  projectId: "tour-pin-sheets-dev",
  storageBucket: ""
};

const envConfig = { stripe: { secret: 'sk_test_UpdxUOXr27yIbDKRM16jBJof00Iwb6jkAE' } };

const fun = TestFunctions(firebaseConfig, 'service-account-dev.json');

fun.mockConfig(envConfig);

export { fun };