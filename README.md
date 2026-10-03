# TerraNova

NASA Space Apps Challenge 2026: **Identify Earth Locations that Analog the
Permanent Moon Base Locations and Mars.**

Pick a Moon or Mars base-site target, or type in your own. The app scores every 0.5° cell of Earth's land (78,247 cells) from NASA
and partner data. It ranks the closest analogs on a 3D globe, explains every
score criterion by criterion with sources, flags which sites are **new** and which are
already-known analogs, and validates itself against catalogued analog sites.

Scoring is deterministic arithmetic in `src/compute`, with no language model, no
randomness and no network access at request time. The same request always returns
the same numbers.

---

## Quick start (Windows, PowerShell)

```powershell
powershell -File scripts/setup.ps1            # .venv on Python 3.12, installs, runs tests
$env:OFFLINE = "1"
.venv\Scripts\uvicorn src.api.main:app --reload
# open http://127.0.0.1:8000/  (Home), then Targets or Finder
```

Three pages: **Home** (`index.html`), **Targets** (`targets.html`, pick a Moon or Mars site)
and the **Finder** (`finder.html`, the globe, rankings and God's Eye). The interface follows
the design system in `DESIGN.md`.

Everything the demo needs is committed: `cache/predictors.zarr`, `cache/derived/*.npy`,
the globe textures in `web/assets/`, three.js in `web/vendor/`, and the Natural Earth
files in `cache/raw/`. It runs with Wi-Fi off.

**Targets** (`data/targets.json`), grouped by region:

| Group | Target | What it represents |
|---|---|---|
| Lunar south pole | Lunar South Pole (Shackleton rim) | Rugged, sunlit polar terrain |
| Lunar south pole | Malapert Massif | Artemis III candidate region (NASA, Oct 2024); very rugged 5 km massif |
| Lunar south pole | Haworth cold trap | Artemis III candidate region; permanently shadowed, never above ~40 K |
| Mars | Jezero Crater | Perseverance site: smooth ancient lake floor |
| Mars | Gale Crater | Curiosity site: crater floor rising into Mount Sharp |
| Your own | Custom target | Type any values; untick criteria to leave them out |

**How matching works.** Each target is a *signature*: a handful of numbers
measured on the Moon or Mars (precipitation, vegetation, temperature swings,
terrain). Every Earth land cell is scored against that one signature. It is not a
comparison of pictures. A target can leave a criterion out (`"value": null`),
for example terrain inside a shadowed crater that nobody has characterised. It can
also set its own default weights; the Haworth cold trap switches on **mean
temperature** at 2×, because "cold" is the defining challenge of a cold trap.

**Using it:** drag to spin the globe; scroll or use **+ / − / ⌂** to zoom (on the flat
map, drag to pan and double-click to zoom). Use the **Show top N** slider (5–100) to rank more or fewer sites, and the **Overlay**
slider to fade the score layer over the imagery. Hover a numbered site, a known-analog diamond
or a list entry for a satellite preview card. Rest the cursor on any land for a moment to
preview that spot. Click a site or any land for a small card with its score and a
**God's Eye 3D** button; the full breakdown opens in the sidebar.

On the map, numbered chips are the top 10, orange dots are ranks 11 and below, and white
diamonds are known analogs. The Moon and Mars in the background are fixed in space: drag
the globe and they come into view or slip behind you, like the stars.

**Previews** come from NASA GIBS (Blue Marble Next Generation, cloud-free, 2°×2°) and
are cached in `cache/thumbs/`. `python -m src.acquire.thumbs` prefetches the top 60 sites
per target plus every known analog (346 images, committed). With `OFFLINE=1`,
other locations fall back to a crop of the local basemap; run without `OFFLINE` to
fetch any spot live.

### God's Eye: 3D view of any site

Click a site and press **God's Eye 3D** on its card (or `E`). The app descends into a 3D
block of the site's real terrain, about 140 km across and centred on the scored 0.5° cell
(outlined in red). The first visit shows a short guide to the mouse and touch controls
(**?** brings it back):

* **Terrain:** AWS Terrain Tiles at zoom 10 (~150 m), mosaicked and measured on the server
  (`src/compute/terrain.py`). The panel reports relief, mean and 90th-percentile slope, and
  the share of the cell a rover could drive (slopes under 15°). It then compares these, with
  a warning about the different baselines, against the target's own measured slope.
* **Imagery:** EOxCloudless Sentinel-2 2020 (ESA Copernicus data processed by EOX,
  CC BY-NC-SA 4.0, fine for non-commercial student projects), or plain shaded relief.
* **Sun:** any elevation and direction, with presets. **Lunar pole** sets the Sun 1.5° above
  the horizon (the Moon's spin axis is tilted only ~1.5°), with a black sky and no sky light:
  roughly how a lunar-pole site would look, lit the Moon's way.
* **Surface:** satellite, shaded relief, **Elevation**, or **Slope** (coloured by steepness, with the 15°
  rover limit marked), plus optional **contour lines** at an automatic interval.
* **Probe:** click the terrain for elevation, slope and coordinates at that point.
* **Profile:** "Measure a profile", click two points, and get the elevation profile with
  climb, descent, the steepest grade and the share over 15°. Then **Drive it** runs a rover
  marker along the path.
* **Turn the sun:** animates the Sun round the sky. Under the lunar preset it circles the
  horizon, as it does at the lunar pole.
* **Climate simulation (illustrative):** pick a month and an hour, or **Play a day**. The Sun
  follows its real path for the site's latitude; the **Thermal** surface shows an estimated
  ground temperature built from the cell's NASA POWER and MODIS numbers (cooler with height,
  warmer on sunlit slopes); **Weather** adds rain, snow or wind-blown dust and clouds in
  proportion to the cell's yearly precipitation. A picture of the climate, not a forecast.
* **True elevation:** the terrain opens at **true vertical scale (1×)**. A badge always shows
  the vertical scale, and turns amber with "Heights ×N (exaggerated)" if you raise it.
  Move the cursor over the terrain to read the real height in metres and the coordinates.
  **Elevation** mode colours the ground by height, with a legend of the block's lowest and
  highest points (the same full-resolution numbers as the stats panel).
* **Controls:** optional height exaggeration (1–6×), cell outline toggle, compass, live
  scale bar, and **Reset all**, which restores every option.

What it cannot be: a live view. The imagery is a 2020 cloud-free composite, and there is no
real-time imagery of the ground. Terrain tiles stop at about ±84° latitude, so Antarctic
interior sites have no 3D view.

Offline: terrain and imagery are cached in `cache/sitetiles/` (gitignored). Prefetch the
demo sites on the presenting laptop:

```bash
python -m src.acquire.sitetiles --top 5     # every target's top 5 sites, ~40 MB
```

### Discovery settings (Results tab, "Filters and weights")

The goal is new places, so by default the ranking shows **new sites only** (more than
500 km from any catalogued analog), **spread out** (at least 800 km apart, at most 2 per
country). All of this can be changed:

* **New sites only**: hide places within 500 km of a known analog.
* **Spread results**: minimum great-circle distance between results (0–2000 km).
* **Max per country**: cap how many results come from one country (Natural Earth country
  borders, so a cell counts for the country it lies in, not the nearest town's).
* **Permissible error**: turns each criterion's exact target into a band. A cell scores
  100% on that criterion anywhere within `error × confidence noise × range` of the target;
  the band is wider for low-confidence target values.

Validation always runs on the full, unfiltered score map. If the rules leave fewer sites
than you asked for, the list says so ("Only 38 of 100 requested sites meet these rules…").
All of these settings are saved in the shareable link.

### How sure are we? (robustness)

* **Stability** (badge on every site, bar in the site card): the target values are
  perturbed 48 times with noise sized by their stated confidence (high 3%, medium 8%,
  low 15% of the range, fixed seed). A site's stability is the share of runs in which it
  stays in the top 1% of land. Most top sites score 80–100%.
* **Leave one criterion out** (Validation tab): each criterion is dropped in turn and the
  whole Earth re-scored. Vegetation is the most important: without it, AUC falls to
  0.62–0.88 for four of the five targets. With any other criterion dropped it stays at 1.00.
* **Do the datasets agree?** (Validation tab): independent datasets are checked against each
  other. MODIS vs NASA POWER surface swing gives ρ = 0.92, precipitation vs NDVI 0.82,
  latitude vs seasonality 0.60, and roughness vs slope 0.52. A test fails if a data rebuild
  ever breaks this agreement.

### Map colours

| Layer | Colours |
|---|---|
| Analog score | orange, brighter = closer match (top half of land only) |
| Precipitation | teal, dark (dry) to light (wet) |
| Vegetation | tan (bare) to deep green (dense) |
| Annual temperature range, day-night swing | white (small swing) to deep orange (large swing): a swing is a size, not a temperature |
| Mean temperature | blue (cold), grey at 0 °C, red (hot) |
| Slope, roughness, elevation | pale to dark phthalo green |

Data-layer colours stop at the range that covers 99% of Earth's land.

### Seeing a place

* **Hover preview:** hovering a site shows its Blue Marble thumbnail (2° × 2°, the scored
  cell outlined).
* **Terrain relief** (site card): Sentinel-2 2020 imagery blended with a hillshade from the
  elevation tiles, so ridges and gullies read in depth. Built on demand and cached in
  `cache/peek/`; prefetch with `python -m src.acquire.peek`. The full 3D view is God's Eye.
* **Latest NASA view** (site card): NASA's newest daily image of the place (VIIRS on
  NOAA-20 via GIBS, 250 m, labelled with its date). This is as close to "live" as open
  satellite imagery gets. It may show clouds and needs internet.
* **Explore tab:** a scatter plot of any two criteria showing the ranked sites (orange
  dots), known analogs (diamonds) and the target (crosshair). Hover or click any point.

### Other tools

* **Search** (`/`): towns, deserts, known analog sites, or typed coordinates (`-24.5, -69.25`).
* **Surprise me** (`R`): fly to a random place in the top 2% that is not in your list.
* **Pin to compare** (`P`): up to three sites side by side, criterion by criterion; the best
  value in each row is highlighted.
* **Guided tour** (`T`, or **Help** > Guided tour): an 8-step walkthrough that drives the
  app. Useful for recording the demo video. **Help** also opens How it works, Data sources
  and the keyboard shortcuts.
* **Status pill** (top right): online or offline, and the current target's validation AUC;
  click it for details and a link to the Validation tab.
* **Keyboard** (`?` lists everything): `J`/`K` next/previous site, `G`/`M` globe/map,
  `+`/`-`/`0` zoom, `V` validation, `Esc` close.
* **Legend histogram:** how land cells are distributed across scores, with the top 10%
  highlighted and cells vetoed to 0% counted separately.

**Sharp imagery when zoomed.** The globe uses an 8192×4096 NASA Blue Marble
texture (4096 on GPUs that cannot take 8K). Zooming in loads NASA GIBS detail tiles:
10° tiles at ~2.2 km/px, then 2.5° tiles at ~540 m/px. Tiles are cached in `cache/tiles/`
(gitignored). To make zoomed views work with Wi-Fi off, prefetch them on the demo laptop:

```bash
python -m src.acquire.tiles --level 1                  # whole world, 648 tiles, ~20 MB
python -m src.acquire.tiles --level 2 --around-top 20  # sharp tiles around every target's top 20
```

The score overlay stays 0.5° cells (~55 km): that is the real resolution of the
analysis, so it fades as you zoom in rather than pretending to be sharper.

Shareable links open a specific state, which is useful for the demo video:

| Link | Opens |
|---|---|
| `finder.html#target=jezero_crater&site=1` | Jezero, the #1 site's detail card |
| `finder.html#target=malapert_massif&top=50` | Malapert Massif, top 50 sites |
| `finder.html#target=lunar_south_pole&tab=validation` | the validation tab |
| `finder.html#target=jezero_crater&view=map&layer=vegetation` | flat map, raw NDVI layer |
| `finder.html#dialog=method` | the "How it works" panel |
| `finder.html#target=lunar_south_pole&site=1&eye=1&sun=lunar` | God's Eye on the #1 site under a lunar polar sun |
| `finder.html#target=moon` / `#target=mars` / `#target=custom` | lunar south pole, Jezero, or the custom profile |

## Troubleshooting

**God's Eye or a zoomed map never finishes loading.** The first time a
site opens, the app downloads tiles from AWS (elevation), EOX (Sentinel-2) and NASA GIBS.
On a slow or filtered network that can stall. Downloads now give up after 30 s per tile and
God's Eye after 2 minutes, showing the reason and a **Retry** button. To diagnose:

```powershell
.venv\Scripts\python -m scripts.check_network    # which data host is slow or blocked
```

The reliable fix for a demo laptop is not to download there at all: copy `cache\sitetiles`,
`cache\peek` and `cache\tiles` from a laptop where the sites already opened (or run the
prefetch commands on a good connection), then start the app with `OFFLINE=1`.

**The app is sluggish right after starting on a slow PC.** It pre-computes the stability
badges in the background. Start it with `$env:EAF_WARM = "0"` to skip that.

## Tests and lint

```bash
python -m pytest tests -q                       # 74 tests, no network
node scripts/ui_smoke.mjs                       # 28 browser checks (needs the app running and Chrome)
python -m ruff check src tests scripts conftest.py
OFFLINE=1 python -m scripts.check_controls      # validation table for every target
```

---

## How it works

```
 remote inputs (first run only)          cache/raw  ->  cache/derived/*.npy  ->  cache/predictors.zarr
 Natural Earth land/lakes, AWS Terrain                     (one per stage)          360 x 720 x 7
 tiles, NASA POWER, MODIS LST, GIBS NDVI                                                  |
                                                                                           v
 data/targets.json  --(earth_percentile resolved via data/normalization.json)-->  src/compute/similarity.py
 data/known_analogs.json  ------------------------------------------------------>  src/compute/validation.py
                                                                                   src/agents/rationale.py
                                                                                           |
                                                           src/api/main.py (FastAPI)  -->  web/ (three.js globe)
```

### Criteria

| Key | What it measures | Source |
|---|---|---|
| `precipitation` | Mean annual precipitation, mm/yr | NASA POWER (MERRA-2) 2001-2020 climatology |
| `vegetation` | Annual max NDVI, clipped at 0 | NASA GIBS `MODIS_Terra_L3_NDVI_Monthly` 2023, colour map inverted exactly |
| `annual_temperature_range` | Warmest minus coldest monthly mean T2M, K | NASA POWER (MERRA-2) |
| `lst_diurnal_range` | Mean day minus night land-surface temperature, K | MODIS Terra LST 2000-2020 (Zenodo 6458406); gaps filled from NASA POWER `TS_RANGE` |
| `slope` | Regional slope of the 0.5° elevation field, degrees | AWS Terrain Tiles (SRTM / GMTED / ETOPO1) |
| `roughness` | RMS height residual over a ~28 km window, m | AWS Terrain Tiles |
| `elevation` | Mean elevation, m (**weight 0 by default**) | AWS Terrain Tiles |
| `mean_annual_temperature` | Mean of the 12 monthly T2M means, °C (**weight 0 by default**; cold-trap targets turn it on) | NASA POWER (MERRA-2) |

The land mask is Natural Earth 1:50m land minus lakes. A cell is a candidate when at least 50% of it is land.

### Scoring

```
t'_k   = clip(t_k, earth_min_k, earth_max_k)            # Earth-reachable target
s_k    = clip(1 - |x_k - t'_k| / (max_k - min_k), 0, 1) # per-criterion similarity
score  = prod_k s_k ** (w_k / sum w)                    # weighted geometric mean
```

* **Beyond Earth.** When a target lies outside the range covering 99% of Earth's
  land (0.5th–99.5th percentile, from `python -m src.acquire.calibrate`), it is
  matched to the nearest edge of that range. The Moon's 120 K day-night swing, for
  example, becomes Earth's ~27 K extreme. The API returns both values.
* **Different scale.** Slope and roughness were measured over 5–75 m on the Moon and
  Mars, but Earth cells are ~55 km. These targets are therefore given as an **Earth
  percentile terrain class** (`earth_percentile` in `data/targets.json`, e.g. "rugged"
  = 85th), with the original measurement kept in `measured_value`.
* **Geometric mean.** One completely mismatched criterion vetoes the cell, so a
  rainforest cannot score well by having the right slope.

### Validation and novelty

`data/known_analogs.json` lists 12 catalogued analog sites (Haughton Crater, Axel
Heiberg, McMurdo Dry Valleys, Atacama, MDRS, Meteor Crater, Craters of the Moon, Askja,
and others). Each has coordinates and its analog use taken from the linked Wikipedia
article. The list also has 8 densely vegetated reference points.

* **Validation** (`/api/validation`, the Validation tab) reports ROC-AUC: how often a
  known analog for the target's body outscores a reference point. Sites chosen for
  geology the model does not measure (Apollo geology training at Sudbury, Ries,
  Kilauea; Río Tinto) are listed but not counted. A target can instead select its
  positives by tag: the Haworth cold trap uses the `cold_polar` sites (Haughton, Axel
  Heiberg, McMurdo Dry Valleys). Current result: **AUC 1.00 for all five targets**. Read it
  as "the score separates analog-like land from green, humid land", not as proof that every
  top site is an analog: the samples are small (3-5 analogs x 8 reference points).
* **Novelty.** A ranked cell is `known` within 150 km of a catalogued site,
  `near_known` within 500 km, and `new` otherwise.

---

## HTTP API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Grid shape, candidate cells, offline flag, build time |
| `GET` | `/api/criteria` | Ranges, Earth envelope, units, sources, default weights |
| `GET` | `/api/targets` | Targets with every criterion's value, Earth-effective value and citation |
| `POST` | `/api/score` | Rank cells for a target or custom profile. `include_field: true` also returns the weighted score surface |
| `POST` | `/api/explain?lat=&lon=` | Full breakdown for any location, in the same shape as a ranked result |
| `GET` | `/api/validation?target_id=` | ROC-AUC and control-site percentiles |
| `GET` | `/api/analogs` | The known-analog catalog |
| `GET` | `/api/scorefield` | Score surface, base64 float32 |
| `GET` | `/api/predictor?key=` | One raw predictor grid |
| `GET` | `/api/cell?lat=&lon=` | Raw values, label and novelty for one cell |
| `GET` | `/api/thumb?lat=&lon=` | NASA Blue Marble preview JPEG of the cell (cached; 404 offline if not cached) |
| `GET` | `/api/tile/{z}/{row}/{col}.jpg` | Detail imagery tile (levels 1–2; cached, 404 offline if not cached) |
| `GET` | `/api/site3d?lat=&lon=&target_id=` | God's Eye terrain: 256×256 heightmap, cell outline, relief and slope statistics |
| `GET` | `/api/imagery/s2/{z}/{x}/{y}.jpg` | Sentinel-2 cloudless imagery tile for God's Eye (cached) |
| `GET` | `/api/search?q=` | Places, regions, known analogs or `lat, lon` |
| `POST` | `/api/robustness` | Monte Carlo stability of the ranked sites and leave-one-criterion-out sensitivity |
| `GET` | `/api/datachecks` | Agreement between independent datasets (Spearman ρ) |
| `GET` | `/api/peek?lat=&lon=` | Relief-shaded Sentinel-2 preview and a 64×64 heightmap |
| `GET` | `/api/sources` | Every dataset, target citation, basemap credit and the LST gap-fill fit |

---

## Rebuilding the data

Each stage caches its output, so you can rebuild one without redoing the others:

```bash
python -m src.acquire.build_predictor_stack                # all stages (first run downloads ~100 MB)
python -m src.acquire.build_predictor_stack --stage power  # land | dem | power | lst | vegetation | assemble
python -m src.acquire.calibrate                            # rewrite Earth envelope + quantiles
python -m src.acquire.basemaps                             # rebuild web/assets/{earth,moon,mars}.jpg
```

The MODIS LST stage reads the cached `cache/derived/lst_modis.npy`. Rebuilding it from
scratch downloads the Zenodo GeoTIFFs (~1 GB).

## Repository layout

| Path | What it is |
|---|---|
| `src/acquire/` | Downloaders and the build: `landmask`, `power`, `gibs_ndvi`, `basemaps`, `build_predictor_stack`, `calibrate` |
| `src/compute/similarity.py` | Scoring model: ranges, Earth envelope, weights, geometric mean, ranking |
| `src/compute/validation.py` | ROC-AUC validation and the novelty label |
| `src/compute/terrain.py` | God's Eye terrain maths: tile geometry, Terrarium decoding, slope, relief and hillshade |
| `src/compute/robustness.py` | Monte Carlo stability and leave-one-criterion-out sensitivity |
| `src/compute/datachecks.py` | Cross-dataset consistency checks |
| `src/compute/gazetteer.py` | Offline place names (82 region envelopes + Natural Earth places) |
| `src/agents/rationale.py` | Rule-based explainer (not a language model); every claim carries a source |
| `src/api/main.py` | FastAPI app |
| `data/` | `targets.json`, `normalization.json`, `known_analogs.json`, `gazetteer.json` |
| `web/` | Pages `index.html` (Home), `targets.html`, `finder.html`; `styles.css`; `app.js` (Finder), `welcome.js`, `targets.js`, `globe.js`, `flatmap.js`, `godseye.js`, `climate.js`, `space.js`, `colors.js`, `ui.js`, `icons.svg`; `assets/`, `vendor/` (three.js, fonts) |
| `DESIGN.md` | The interface design system: tokens, type, icons, motion |
| `docs/` | `REVIEW.md`, `TEAM_PLAN.md`, `VIDEO_SCRIPT.md`, `AI_USE.md`, `DATA_REQUESTS.md` |

## Known limitations

1. **Resolution.** Cells are 0.5° (~55 km), so small features are averaged with their
   surroundings. Mauna Kea's cell includes forested slopes; the Dry Valleys share their
   cell with ice.
2. **Terrain targets are classes, not measurements.** Matched-scale slope statistics
   from PGDA Product 78 and HiRISE DTMs are the next step (see `docs/DATA_REQUESTS.md`).
3. **Reanalysis precipitation.** NASA POWER (MERRA-2) can overestimate polar deserts:
   Haughton reads 342 mm/yr.
4. **LST gap fill.** Where MODIS has no data (mainly Antarctica, 24,190 cells), the
   day-night swing is predicted from POWER `TS_RANGE` (linear fit, r = 0.92).
5. **Latitude limits.** The elevation tiles stop at ±85.05°, so the far polar interiors
   are not scored.
6. **Sub-sites at one pole look alike at this resolution.** Malapert Massif and the
   Shackleton rim share the same polar thermal data and differ only in terrain class, so
   their Earth rankings are similar. Measured slope maps (PGDA Product 78) would separate
   them; see `docs/DATA_REQUESTS.md`.
7. **The cold trap matches ice sheets.** Earth's coldest, driest land is the East Antarctic
   plateau, which is ice, not ice-cemented regolith. Telling ice sheets apart from ice-free
   permafrost (the Dry Valleys) needs an ice-cover layer.
8. **NDVI decoding.** GIBS NDVI is decoded to the lower edge of each 0.005-wide colour bin,
   and "no data", water, ice and snow all read as 0 (no vegetation).
9. **Novelty is distance-based.** "New" means more than 500 km from any catalogued analog's
   footprint. The catalog is 12 sites; large regions (the Atacama) carry an extent, but a
   place can be "new" to this catalog and still have been studied elsewhere.

## Licence and credits

Code is Apache-2.0 (see [LICENSE](LICENSE)). three.js is MIT (`web/vendor/three/LICENSE`).
Data sources keep their own terms; every dataset is listed in the app under **Data
sources** and in `/api/sources`. Imagery: NASA Blue Marble Next Generation, NASA Moon
Trek (LRO WAC), NASA Mars Trek (Viking MDIM 2.1). God's Eye imagery: EOxCloudless
https://cloudless.eox.at by EOX IT Services GmbH (Contains modified Copernicus Sentinel
data 2020), CC BY-NC-SA 4.0. God's Eye terrain: AWS Terrain Tiles. Place names: Natural
Earth (public domain).
