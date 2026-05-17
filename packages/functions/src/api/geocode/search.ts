import { middyfy, toError } from "@shared/index";
import {
  type AddressSuggestion,
  type SearchAddressEvent,
  SearchAddressEventSchema,
  type SearchAddressResponse,
} from "@twy/core";
import type { APIGatewayProxyEventV2WithJWTAuthorizer } from "aws-lambda";
import createError from "http-errors";

interface PhotonProperties {
  osm_id?: number | string;
  osm_type?: string;
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  countrycode?: string;
  postcode?: string;
  type?: string;
}

interface PhotonFeature {
  type: "Feature";
  properties: PhotonProperties;
  geometry: { type: "Point"; coordinates: [number, number] };
}

interface PhotonResponse {
  type: "FeatureCollection";
  features: PhotonFeature[];
}

const buildStreetAddress = (p: PhotonProperties): string => {
  const parts = [p.street, p.housenumber].filter((v): v is string => Boolean(v));
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return p.name ?? "";
};

const buildCityZip = (p: PhotonProperties): string | null => {
  const cityLike = p.city ?? p.district ?? p.state ?? null;
  const segments = [p.postcode, cityLike].filter((v): v is string => Boolean(v));
  return segments.length > 0 ? segments.join(" ") : null;
};

const buildDisplayName = (p: PhotonProperties): string => {
  const street = buildStreetAddress(p);
  const cityZip = buildCityZip(p);
  const segments = [street, cityZip, p.country].filter((v): v is string => Boolean(v));
  return segments.join(", ");
};

export const toSuggestion = (feature: PhotonFeature): AddressSuggestion => {
  const [longitude, latitude] = feature.geometry.coordinates;
  const p = feature.properties;
  const placeId =
    p.osm_type && p.osm_id !== undefined ? `${p.osm_type}/${p.osm_id}` : `${longitude},${latitude}`;
  return {
    placeId,
    displayName: buildDisplayName(p),
    address: buildStreetAddress(p),
    cityZipCode: buildCityZip(p),
    city: p.city ?? p.district ?? null,
    postcode: p.postcode ?? null,
    country: p.country ?? null,
    latitude,
    longitude,
  };
};

const searchAddress = async (event: SearchAddressEvent): Promise<SearchAddressResponse> => {
  const { q, limit, lang } = event.queryStringParameters;
  if (q.trim().length < 3) {
    return { results: [] };
  }

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(Math.min(limit * 3, 15)));
  url.searchParams.set("lang", lang);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "twy-dispatch/1.0 (geocoding-proxy)" },
    });
    if (!res.ok) {
      throw new createError.BadGateway(`Photon responded with ${res.status}`);
    }
    const photon = (await res.json()) as PhotonResponse;
    const seen = new Set<string>();
    const results: AddressSuggestion[] = [];
    for (const feature of photon.features) {
      const suggestion = toSuggestion(feature);
      const dedupeKey = [suggestion.address, suggestion.cityZipCode ?? "", suggestion.country ?? ""]
        .join("|")
        .toLowerCase();
      if (!dedupeKey.trim() || seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      results.push(suggestion);
      if (results.length >= limit) break;
    }
    return { results };
  } catch (error) {
    if (createError.isHttpError(error)) {
      throw error;
    }
    throw new createError.BadGateway(`Photon request failed: ${toError(error).message}`);
  }
};

export const handler = middyfy<
  SearchAddressEvent,
  SearchAddressResponse,
  APIGatewayProxyEventV2WithJWTAuthorizer
>(searchAddress, {
  eventSchema: SearchAddressEventSchema,
  mode: "parse",
});
