export interface AddressSuggestion {
  placeId: string;
  displayName: string;
  address: string;
  cityZipCode: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

export interface SearchAddressResponse {
  results: AddressSuggestion[];
}

export interface RouteGeometry {
  type: "LineString";
  coordinates: Array<[number, number]>;
}

export interface GetRouteResponse {
  geometry: RouteGeometry;
  distanceMeters: number;
  durationSeconds: number;
}
