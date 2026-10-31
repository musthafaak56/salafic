import timezoneAt from "tz-lookup";
import { mapsUrl, coordinatesFromMaps } from "../../functions/maps.js";

export function resolveMapLocation(value) {
  const url = mapsUrl(value);
  const point = coordinatesFromMaps(url.href);
  if (!point)
    throw new Error(
      "Paste the full Google Maps place or dropped-pin URL containing its coordinates. Open a shortened share link in your browser first, then copy the full address. Search and camera-only links cannot identify the center.",
    );
  return {
    ...point,
    mapsUrl: url.href,
    timezone: timezoneAt(point.latitude, point.longitude),
  };
}
