# Real Address Autocomplete + Coordinates + Modern Map for Load Stops

## Context

Today, load pickup/dropoff stops in `load_stop` are stored as plain text (`cityZipCode`, `address`) with no geographic coordinates. The map at `apps/dashboard/src/features/load/components/LoadMap.tsx` renders **hashed placeholder coordinates** centered on Europe and a dashed straight polyline — there's an explicit TODO acknowledging that real geocoding is needed. The two‑panel UI redesign (commit `38199c5`) lined up the visual scaffolding; this change fills in the missing data.

Goal: a dispatcher types a partial address, sees real suggestions, picks one, and the stop is stored with full address + lat/lng. The map then draws real road geometry between stops on a clean minimalistic light tile layer, with modern markers and distance/duration in the overlay card.

## Provider stack (chosen)

| Concern | Choice | Endpoint | Cost |
|---|---|---|---|
| Address autocomplete | **Photon (Komoot)** | `https://photon.komoot.io/api/?q=…&limit=5` | Free, no key |
| Road routing | **OSRM public demo** | `https://router.project-osrm.org/route/v1/driving/{coords}?overview=full&geometries=geojson` | Free, no key, demo-only SLA |
| Map tiles | **CartoDB Positron** | `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png` | Free, no key, attribution required |
| Architecture | **Backend proxy** | New handlers under `packages/functions/src/api/geocode/` | — |

All free. Photon and OSRM hits flow through our Lambda so we can later add caching, swap providers, or attach an API key without changing the frontend.

---

## Phase 1 — DB layer

### Schema change

**`packages/db/src/schema/loadStop.ts`** — add three nullable columns at the end of the column block:

```ts
import { integer, numeric, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";

export const loadStop = pgTable(
  "load_stop",
  {
    id: uuid().primaryKey().defaultRandom(),
    loadId: uuid().notNull().references(() => load.id, { onDelete: "cascade" }),
    kind: text().$type<LoadStopKind>().notNull(),
    sortOrder: integer().notNull(),
    cityZipCode: text(),
    phone: text(),
    address: text().notNull(),
    // new
    latitude: numeric({ precision: 10, scale: 7 }),    // -90..90, 7 decimals ≈ 1.1cm
    longitude: numeric({ precision: 10, scale: 7 }),   // -180..180
    placeId: text(),                                    // Photon `${osm_type}/${osm_id}` for de-dup/refresh
  },
  (t) => [unique("load_stop_load_id_kind_sort_order_uq").on(t.loadId, t.kind, t.sortOrder)],
);
```

All nullable so the migration is additive — existing rows stay valid. `cityZipCode` and `address` are kept as-is (populated from the Photon result on the frontend).

### Migration

```bash
pnpm sst shell --stage dev -- pnpm --filter @twy/db db:generate
```

Produces `packages/db/drizzle/0023_<adjective>_<noun>.sql` + `meta/` snapshot. Both committed. After deploy, CI applies it via `runMigrations`; locally:

```bash
pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate
```

---

## Phase 2 — Core layer (schemas + repository)

### Zod schemas

**`packages/core/src/load/request.ts`** — extend `locationSchema`:

```ts
const locationSchema = z.object({
  address: z.string().min(1),
  cityZipCode: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  // new
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  placeId: z.string().nullable().optional(),
});
```

Reused by create, update, list — single edit covers backend validation everywhere.

**`packages/core/src/load/response.ts`** — mirror the new fields on the response location schema so derived TS types pick them up.

### Repository

**`packages/core/src/load/repository.ts`**:

1. Extend `LoadLocationRecord` (around lines 66–70) with `latitude`, `longitude`, `placeId` (all `number | string | null`).
2. In `replaceLoadStopsForKind` (≈ lines 532–554), include the new fields in the `tx.insert(loadStop).values([...])` payload.
3. In `getLoadById` / `listLoads` SELECT projections, include the new columns.

**Numeric ↔ JS:** Drizzle returns `numeric` as `string` by default. Cast to `number | null` in the projection so the response type stays clean:

```ts
latitude: row.latitude !== null ? Number(row.latitude) : null,
longitude: row.longitude !== null ? Number(row.longitude) : null,
```

---

## Phase 3 — New Lambda handlers (backend proxy)

### New domain bundle

```
packages/core/src/geocode/
├── request.ts    # SearchAddressEventSchema, GetRouteEventSchema
├── response.ts   # SearchAddressResponse, GetRouteResponse, AddressSuggestion
└── index.ts      # barrel
```

Add `export * from "./geocode/index.js"` to `packages/core/src/index.ts`.

`AddressSuggestion` shape (returned by `/api/geocode/search`):

```ts
{
  placeId: string;            // `${osm_type}/${osm_id}`
  displayName: string;        // single-line address for UI dropdown
  address: string;            // street + housenumber → loadStop.address
  cityZipCode: string | null; // `${city}, ${postcode}` → loadStop.cityZipCode
  city: string | null;
  postcode: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}
```

### Search handler

**`packages/functions/src/api/geocode/search.ts`** — follows the `packages/functions/src/api/load/create.ts` pattern (middyfy + Zod + `mode: "parse"`):

```ts
const searchAddress = async (event: SearchAddressEvent): Promise<SearchAddressResponse> => {
  const { q, limit = 5, lang = "en" } = event.queryStringParameters;
  if (q.trim().length < 3) return { results: [] };

  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(Math.min(limit, 10)));
  url.searchParams.set("lang", lang);

  const res = await fetch(url, { headers: { "User-Agent": "twy-dispatch/1.0" } });
  if (!res.ok) throw new createError.BadGateway(`Photon ${res.status}`);

  const photon = (await res.json()) as PhotonResponse;
  return { results: photon.features.map(toSuggestion) };
};

export const handler = middyfy(searchAddress, {
  eventSchema: SearchAddressEventSchema,
  mode: "parse",
});
```

`toSuggestion` is a pure mapper from Photon's GeoJSON `Feature` → `AddressSuggestion`. Easy to unit-test with a fixture.

### Route handler

**`packages/functions/src/api/geocode/route.ts`** — POST so coordinates are a typed array:

```ts
const getRoute = async (event: GetRouteEvent): Promise<GetRouteResponse> => {
  const { coordinates } = event.body; // [[lng, lat], [lng, lat], ...]
  if (coordinates.length < 2) throw new createError.BadRequest("Need ≥2 coordinates");

  const coordStr = coordinates.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new createError.BadGateway(`OSRM ${res.status}`);

  const osrm = (await res.json()) as OsrmResponse;
  if (osrm.code !== "Ok" || !osrm.routes[0]) throw new createError.NotFound("No route");

  const route = osrm.routes[0];
  return {
    geometry: route.geometry,          // GeoJSON LineString
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  };
};
```

### Routes

**`infra/routes.ts`** — register two new routes, no DB binding:

```ts
{ routeKey: "GET /api/geocode/search", handler: "packages/functions/src/api/geocode/search.handler", linkKeys: [], requireAuth: true },
{ routeKey: "POST /api/geocode/route", handler: "packages/functions/src/api/geocode/route.handler",  linkKeys: [], requireAuth: true },
```

`requireAuth: true` prevents the open internet from using us as a free geocoding service.

---

## Phase 4 — Frontend: geocoding feature

### New feature folder

```
apps/dashboard/src/features/geocoding/
├── api/geocodingApi.ts              # searchAddress(q), getRoute(coords)
├── components/AddressAutocomplete.tsx
├── hooks/useAddressSearch.ts        # debounced TanStack query
├── hooks/useRoute.ts                # TanStack query for OSRM geometry
└── types/geocoding.ts               # re-exports from core
```

### `geocodingApi.ts`

```ts
export const geocodingApi = {
  searchAddress: async (q: string, limit = 5): Promise<AddressSuggestion[]> => {
    const res = await ApiClient.get<ApiResponse<{ results: AddressSuggestion[] }>>(
      "/geocode/search", { q, limit }
    );
    return res.data.results;
  },
  getRoute: async (coordinates: Array<[number, number]>): Promise<RouteResult> => {
    const res = await ApiClient.post<ApiResponse<RouteResult>>(
      "/geocode/route", { coordinates }
    );
    return res.data;
  },
};
```

### `useAddressSearch.ts`

`useApiQuery` wrapper from `@/libs/query` with `enabled: q.length >= 3`, `keepPreviousData: true`, query key `["geocode", "search", q]`. Debounce upstream (250ms) by deriving `q` from a debounced input value.

### `useRoute.ts`

`useApiQuery` keyed on `["geocode", "route", coordsKey]` where `coordsKey = JSON.stringify(coordinates)`. `enabled: coordinates.length >= 2`.

### `AddressAutocomplete.tsx`

HeroUI `<Autocomplete>` — same pattern as `apps/dashboard/src/features/broker/components/BrokerAutocomplete.tsx`. Controlled component:

```ts
type Props = {
  value: AddressSuggestion | null;
  onChange: (suggestion: AddressSuggestion | null) => void;
  label?: string;
  errorMessage?: string;
};
```

Items render two-line: `displayName` on top, `cityZipCode, country` muted below. On selection, calls `onChange` with the full suggestion in one shot.

---

## Phase 5 — Frontend: load form wiring

### Types

**`apps/dashboard/src/features/load/types/load.ts`** — extend `Location` with `latitude?: number | null`, `longitude?: number | null`, `placeId?: string | null`.

### `LoadStopsFormList.tsx`

Replace the two existing TextField rows (`cityZipCode` Input + `address` TextArea) with a single `<AddressAutocomplete>` per stop. Keep the phone field and the +/- stop controls.

```tsx
<AddressAutocomplete
  label="Address"
  value={toSuggestion(field)}
  onChange={(s) =>
    update(index, {
      address: s?.address ?? "",
      cityZipCode: s?.cityZipCode ?? null,
      latitude: s?.latitude ?? null,
      longitude: s?.longitude ?? null,
      placeId: s?.placeId ?? null,
      phone: field.phone,
    })
  }
/>
```

Validation: `address` stays required. If a stop is loaded for editing and has no `latitude`/`longitude` (legacy data), render a subtle "uncoordinated" chip next to the field so the user knows to re-select.

### `LoadFormModal.tsx`

No structural change — the form payload already flows `pickups`/`dropoffs` arrays through. New fields just propagate.

---

## Phase 6 — Map redesign

**`apps/dashboard/src/features/load/components/LoadMap.tsx`** — full rework guided by these rules:

### Tile layer

```tsx
<TileLayer
  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
  subdomains="abcd"
  maxZoom={20}
  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
/>
```

Re-enable `attributionControl` at `position="bottomleft"` (CARTO terms require it; small + unobtrusive on light theme).

### Real coordinates

- Delete `placeholderCoord` + `hashString` helpers and the TODO at line 18.
- Read `stop.latitude` / `stop.longitude` directly. Filter out stops missing either coordinate from `allPts`.

### Real road routing

- Use `useRoute(coordinates)` when `coordinates.length >= 2`.
- Render with `<GeoJSON data={geometry} pathOptions={{ color: "#0f172a", weight: 3, opacity: 0.9 }} />` instead of straight `<Polyline>`.
- Fallback: if the route hook errors or has missing coords, render the existing dashed straight polyline so the map is never empty.

### Markers (minimalist + modern)

Replace the SVG pin `divIcon` with a centered dot — modern minimal map UIs use a dot, not a pin tail:

- Pickup: `#2563eb` (blue-600) circle, 14px, white 2px border, soft `0 2px 8px rgba(0,0,0,0.15)` shadow.
- Dropoff: `#0f172a` (slate-900) circle, 14px, white 2px border, same shadow.
- Index label (1, 2, …) rendered inside the circle as a small monospace digit when a leg has multiple stops.
- Keep `className: "twy-map-pin"`; add a small CSS rule in `apps/dashboard/src/app/index.tsx` (or co-located CSS) for the shadow transition.

### Container polish

- `zoomSnap={0.5}`, `wheelDebounceTime={40}` on `MapContainer` — smoother trackpad feel.
- `<ZoomControl position="bottomright" />` stays; style its buttons with a Tailwind override (`.leaflet-control-zoom a { … }`) to flatten the default chunky Leaflet skin into a soft white rounded card.
- Default view stays Europe (recent commit `b24763a`). Keep the existing `FitBounds` so the map auto-fits when ≥1 real coordinate is available.

### Distance + duration

Surface `route.distanceMeters` and `route.durationSeconds` from `useRoute`. Format and render inside **`LoadDetailOverlayCard.tsx`** as a small subtitle next to the reference number — e.g. `"432 km · 5h 12m"`. Add formatters in `packages/core/src/shared/formatters.ts` if not present (`formatDistanceKm`, `formatDurationHm`).

---

## Phase 7 — Tests + cleanup

- Unit test `toSuggestion` mapper in `packages/functions/src/api/geocode/search.test.ts` — deterministic Photon fixture in, normalized `AddressSuggestion` out.
- Unit test `getRoute` with a stubbed OSRM response (success + `code: "NoRoute"` + HTTP 500 paths).
- Delete `placeholderCoord`, `hashString`, and the TODO line in `LoadMap.tsx`.
- Sweep imports for unused leaflet types after the marker rewrite.

---

## Verification

End-to-end loop, ordered:

1. **Migration generates clean SQL:**
   ```bash
   pnpm sst shell --stage dev -- pnpm --filter @twy/db db:generate
   ```
   Open `packages/db/drizzle/0023_*.sql` — expect exactly three `ALTER TABLE load_stop ADD COLUMN …` statements.

2. **Migration applies:**
   ```bash
   pnpm sst shell --stage dev -- pnpm --filter @twy/db migrate
   ```

3. **Deploy:**
   ```bash
   pnpm sst deploy --stage <yourname>
   ```

4. **Backend smoke test:**
   ```bash
   curl -H "Authorization: Bearer <jwt>" \
     "https://<your-stage-domain>/api/geocode/search?q=Munich+Hauptbahnhof"
   # → 5 results with lat/lng
   curl -X POST -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" \
     "https://<your-stage-domain>/api/geocode/route" \
     -d '{"coordinates":[[11.558,48.140],[13.405,52.520]]}'
   # → { geometry: { type: "LineString", coordinates: [...] }, distanceMeters, durationSeconds }
   ```

5. **UI loop** (`pnpm run:dashboard`):
   - Loads → "Create load" → Pickup step → type "Munich" → suggestions appear within ~300ms → pick one → address + cityZipCode populate.
   - Add a dropoff in another city → Save.
   - Open the saved load → right panel: real road polyline drawn on a light CARTO map between two compact dot markers; overlay card shows "432 km · 5h 12m".
   - Open a **legacy** load (no coords) → each stop shows the "uncoordinated" chip; map shows only the available stops; no crash.

6. **Lint + types + tests:**
   ```bash
   /verify    # biome ci + turbo build + turbo test
   ```

7. **Review:** `code-reviewer` subagent on the diff before `/ship`.

---

## Critical files

| Layer | File |
|---|---|
| DB schema | `packages/db/src/schema/loadStop.ts` |
| DB migration | `packages/db/drizzle/0023_*.sql` (generated) |
| Core schemas | `packages/core/src/load/request.ts`, `packages/core/src/load/response.ts` |
| Core repo | `packages/core/src/load/repository.ts` |
| Core new domain | `packages/core/src/geocode/{request,response,index}.ts` |
| Core barrel | `packages/core/src/index.ts` |
| Functions new | `packages/functions/src/api/geocode/{search,route}.ts` |
| Functions tests | `packages/functions/src/api/geocode/{search,route}.test.ts` |
| Infra routes | `infra/routes.ts` |
| Frontend new | `apps/dashboard/src/features/geocoding/**` |
| Frontend form | `apps/dashboard/src/features/load/components/LoadStopsFormList.tsx` |
| Frontend types | `apps/dashboard/src/features/load/types/load.ts` |
| Frontend map | `apps/dashboard/src/features/load/components/LoadMap.tsx` |
| Frontend overlay | `apps/dashboard/src/features/load/components/LoadDetailOverlayCard.tsx` |
| Frontend formatters | `packages/core/src/shared/formatters.ts` (add `formatDistanceKm`, `formatDurationHm` if missing) |

## Patterns reused (no new abstractions)

- HeroUI `<Autocomplete>` — mirrors `apps/dashboard/src/features/broker/components/BrokerAutocomplete.tsx`.
- `middyfy` + Zod handler shape — mirrors `packages/functions/src/api/load/create.ts`.
- `replaceLoadStopsForKind` insert path — already exists in `packages/core/src/load/repository.ts`.
- `FitBounds` helper — already in `LoadMap.tsx`.
- `useApiQuery` / `useApiMutation` from `@/libs/query` — already centralised (session memory 9213).
- `ApiClient` axios wrapper — never use raw `fetch`/`axios` on the frontend.

## Out of scope (future enhancements)

- Backend cache layer (DynamoDB or in-memory) for repeated Photon queries.
- Switch OSRM demo → self-hosted or OpenRouteService once production volume justifies SLA.
- Truck-specific routing profiles (height/weight restrictions) — OSRM supports profiles; needs self-hosting.
- One-time backfill script to reverse-geocode existing `load_stop` rows from their text addresses.
- Dark-mode tile variant (CartoDB `dark_all`) once the dashboard gets a theme switcher.
