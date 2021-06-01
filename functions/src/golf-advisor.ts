const functions = require("firebase-functions");
const helpers = require("./helpers");
const request = require("request");

const hostname =
  process.env.GOLF_ADVISOR_URL || functions.config().golf_advisor.url;

const getGolfDataById = (golfAdvisorCourseId) => {
  const options = {
    method: "GET",
    url: `https://${hostname}/ajax/course-layout/`,
    qs: { id: golfAdvisorCourseId },
  };

  return new Promise((resolve, reject) => {
    request(options, function (error, response, body) {
      if (error) reject(error);
      resolve(body);
    });
  });
};
export const getGolfAdvisorDataById = functions.https.onCall(
  async (data, context) => {
    helpers.assertUID(context);
    const courseId = helpers.assert(data, "courseId");
    return await helpers.catchErrors(getGolfDataById(courseId));
  }
);
