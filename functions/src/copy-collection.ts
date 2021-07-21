import { db } from "./config";
import * as functions from "firebase-functions";
import { assert, assertUID, catchErrors } from "./helpers";

type params = {
  collectionFrom: string;
  docId: string;
  collectionTo: string;
  addData?: any;
  recursive?: boolean;
};

export const _duplicateDoc = async ({
  collectionFrom,
  docId,
  collectionTo,
  addData = {},
  recursive = false,
}: params): Promise<boolean> => {
  // document reference
  const docRef = db.collection(collectionFrom).doc(docId);

  // copy the document
  const docData = await docRef
    .get()
    .then((doc) => doc.exists && doc.data())
    .catch((error) => {
      console.error(
        "Error reading document",
        `${collectionFrom}/${docId}`,
        JSON.stringify(error)
      );
      throw new functions.https.HttpsError(
        "not-found",
        "Copying document was not read"
      );
    });

  if (docData) {
    // found the document
    // document exists, create the new item
    const newDocRef = await db
      .collection(collectionTo)
      .add({ ...docData, ...addData })
      .catch((error) => {
        console.error(
          "Error creating document",
          `${collectionTo}/${docId}`,
          JSON.stringify(error)
        );
        throw new functions.https.HttpsError(
          "data-loss",
          "Data was not copied properly to the target collection, please try again."
        );
      });

    // if copying of the subcollections is needed
    if (recursive) {
      // subcollections
      const subcollections = await docRef.listCollections();
      for await (const subcollectionRef of subcollections) {
        const subcollectionPath = `${collectionFrom}/${docId}/${subcollectionRef.id}`;

        // get all the documents in the collection
        return await subcollectionRef
          .get()
          .then(async (snapshot) => {
            const docs = snapshot.docs;
            for await (const doc of docs) {
              await _duplicateDoc({
                collectionFrom: subcollectionPath,
                docId: doc.id,
                collectionTo: `${collectionTo}/${newDocRef.id}/${subcollectionRef.id}`,
                recursive: true,
              });
            }
            return true;
          })
          .catch((error) => {
            console.error(
              "Error reading subcollection",
              subcollectionPath,
              JSON.stringify(error)
            );
            throw new functions.https.HttpsError(
              "data-loss",
              "Data was not copied properly to the target collection, please try again."
            );
          });
      }
    }
    return true;
  }
  return false;
};

export const duplicateDocument = functions.https.onCall(
  async (data, context) => {
    assertUID(context);
    const collectionFrom = assert(data, "collectionFrom");
    const collectionTo = assert(data, "collectionTo");
    const recursive = Boolean(assert(data, "recursive"));
    const docId = assert(data, "docId");
    const addData = data.addData || {};

    return await catchErrors(
      _duplicateDoc({
        collectionFrom,
        docId,
        collectionTo,
        addData,
        recursive,
      })
    );
  }
);
