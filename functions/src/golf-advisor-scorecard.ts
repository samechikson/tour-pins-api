const functions = require("firebase-functions");
const helpers = require("./helpers");
const request = require("request");
const cheerio = require("cheerio");

const url =
  process.env.GOLF_ADVISOR_COURSE_URL ||
  functions.config().golf_advisor.course_url;

const getGolfCourseHtmlPage = (golfAdvisorCourseId) => {
  const options = {
    method: "GET",
    url: `${url}/${golfAdvisorCourseId}`,
  };

  return new Promise((resolve, reject) => {
    request(options, function (error, response, body) {
      if (error) reject(error);
      resolve(body);
    });
  });
};

const scrapeScorecardData = (html) => {
  const $ = cheerio.load(html);

  const scorecard = [];

  const tableElement = $(".CourseScorecard-table");

  tableElement.find("thead tr th").each((i, el) => {
    const header = $(el).text().trim();
    scorecard.push({
      header,
    });
  });

  tableElement.find("tbody tr").each((i, trElement) => {
    const label = $(trElement)
      .find("td:first")
      .text()
      .trim()
      .toLowerCase()
      .replace(/[^[a-z]/gi, "")
      .replace(/-m-|-w-|-+/g, "");

    $(trElement)
      .find("td")
      .each((j, tdElement) => {
        const index = j;
        const value = $(tdElement).text().trim();
        scorecard[index][label] = value;
      });
  });

  // Filter out scorecard entries that are not numbers
  return scorecard.filter((entry) => {
    return Number.isInteger(parseInt(entry["header"]));
  });
};

async function getScorecardData(courseId) {
  const courseHtml = await getGolfCourseHtmlPage(courseId);

  return scrapeScorecardData(courseHtml);
}

export const getGolfCourseScorecardById = functions.https.onCall(
  async (data, context) => {
    helpers.assertUID(context);
    const courseId = helpers.assert(data, "courseId");

    return await getScorecardData(courseId);
  }
);
