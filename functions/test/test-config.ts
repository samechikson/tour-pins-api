import * as TestFunctions from 'firebase-functions-test';

const firebaseConfig = {
  databaseURL: "https://tour-pin-sheets.firebaseio.com",
  projectId: "tour-pin-sheets",
  storageBucket: "tour-pin-sheets.appspot.com"
}

const envConfig = { stripe: { testkey: 'sk_test_yourkey' } };

const fun = TestFunctions(firebaseConfig, 'service-account.json')

fun.mockConfig(envConfig);

export { fun };