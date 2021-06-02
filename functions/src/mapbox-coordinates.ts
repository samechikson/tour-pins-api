const functions = require("firebase-functions");
const helpers = require("./helpers");
const request = require("request");
const VectorTile = require("@mapbox/vector-tile").VectorTile;
const Protobuf = require("pbf");
const zlib = require("zlib");

function extractFeaturesFromTile(data, zoom, x, y) {
  let buffer;
  // handle zipped buffers
  if (data[0] === 0x78 && data[1] === 0x9c) {
    buffer = zlib.inflateSync(data);
  } else if (data[0] === 0x1f && data[1] === 0x8b) {
    buffer = zlib.gunzipSync(data);
  } else {
    buffer = data;
  }

  const tile = new VectorTile(new Protobuf(buffer));
  const layers = Object.keys(tile.layers);
  console.log(
    "🚀 ~ file: mapbox-coordinates.ts ~ line 18 ~ readTile ~ layers",
    layers
  );

  const features = {};
  const featuresToLookFor = ["green", "bunker", "fairway"];
  for (let i = 0; i < tile.layers.landuse.length; i++) {
    console.log(tile.layers.landuse.feature(i).properties);

    for (const feature of featuresToLookFor) {
      if (tile.layers.landuse.feature(i).properties.type === feature) {
        features[feature] = tile.layers.landuse
          .feature(i)
          .toGeoJSON(x, y, zoom);
      }
    }
  }

  return features;
}

function lon2tile(lon, zoom) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat, zoom) {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

function getMapboxTileUrlFromLatLong(zoom, x, y) {
  const baseUrl =
    process.env.MAPBOX_BASE_URL || functions.config().mapbox.base_url;
  const mapStyleId =
    process.env.MAPBOX_MAP_STYLE_ID || functions.config().mapbox.map_style_id;
  const access_token =
    process.env.MAPBOX_ACCESS_TOKEN || functions.config().mapbox.access_token;

  return `${baseUrl}${zoom}/${x}/${y}.mvt?style=${mapStyleId}&access_token=${access_token}`;
}

async function getGeoJson(zoom, lat, long) {
  const x = lon2tile(long, zoom);
  const y = lat2tile(lat, zoom);
  console.log("🚀 ~ file: index.js ~ line 86 ~ x", x);
  console.log("🚀 ~ file: index.js ~ line 88 ~ y", y);

  return new Promise((resolve, reject) => {
    request(
      {
        url: getMapboxTileUrlFromLatLong(zoom, x, y),
        gzip: true,
        encoding: null,
      },
      function (err, response, body) {
        if (err) {
          reject(err);
        }
        if (response.statusCode === 401) {
          new Error("Invalid Token");
        }
        if (response.statusCode !== 200) {
          new Error(
            `Error retrieving data:${JSON.stringify(response, null, 2)}`
          );
        }

        resolve(extractFeaturesFromTile(body, zoom, x, y));
      }
    );
  });
}

export const getMapboxVectorDataForCoordinates = functions.https.onCall(
  async (data, context) => {
    helpers.assertUID(context);
    const long = helpers.assert(data, "long");
    const lat = helpers.assert(data, "lat");
    const zoom = helpers.assert(data, "zoom");

    return await helpers.catchErrors(getGeoJson(zoom, lat, long));
  }
);
