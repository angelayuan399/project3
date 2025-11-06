# CMIP6 D3.js Starter (Only D3)

This is a minimal starter you can deploy on GitHub Pages. It uses **only D3** (TopoJSON client is a non-plotting helper for map geometry). Replace the sample CSVs in `/data` with your CMIP6 exports.

## Files
- `index.html` — layout + controls
- `styles.css` — minimal styles
- `main.js` — map + linked line chart + interactions (year slider, metric toggle, region buttons)
- `/data/*.csv` — sample data to make the page run out-of-the-box

## Expected CSV Schemas
### `data/global_timeseries.csv`
```
date,temp_c,anomaly
1950-01-15,13.62,-0.35
...
```
Where `date` is a monthly timestamp (YYYY-MM-DD).
### `data/regional_timeseries.csv`
```
region,date,temp_c,anomaly
Global,1950-01-15,13.62,-0.35
Arctic,1950-01-15,-6.12,-0.40
...
```
Regions used by the UI: `Global, Arctic, Tropics, US, Europe` (you can add more).
### `data/grid_anomaly.csv`
```
year,lat,lon,temp_c,anomaly
2010,40.0,-100.0,15.1,1.2
2010,42.5,-97.5,14.9,1.1
...
```
Use a coarse grid (e.g., 2.5°) so the file stays small for the browser.

## How to Generate CSVs from CMIP6 (Python/xarray)
1. Start from the example notebook you uploaded that shows how to read CMIP6 tas and compute global means. (See your `basic_search_and_load-colab.ipynb` PDF.)  
2. Extend it to export CSVs:

```python
import xarray as xr, pandas as pd, numpy as np, gcsfs

# 1) Open one model's tas (historical) and an area grid; compute global mean per month
# ... (use your existing code to define ds (tas) and ds_area (areacella))
# ta_timeseries = (ds.tas * ds_area.areacella).sum(dim=['lon','lat']) / ds_area.areacella.sum(dim=['lon','lat'])

# Convert to °C if in Kelvin
gts = ta_timeseries.to_series().rename('temp_k').to_frame()
gts['temp_c'] = gts['temp_k'] - 273.15

# Compute an anomaly baseline (e.g., 1951–1980)
baseline = gts.loc['1951':'1980']['temp_c'].mean()
gts['anomaly'] = gts['temp_c'] - baseline
gts.reset_index().rename(columns={'time':'date'})[['date','temp_c','anomaly']].to_csv('data/global_timeseries.csv', index=False)

# 2) Regional series (example: Arctic (>60N), Tropics (20S–20N), US (~lat 25–50N & lon -125–-65), Europe (~lat 35–70N & lon -10–40E))
def area_weighted_mean(sub):
    w = ds_area.areacella.where(sub.tas.notnull())
    return (sub.tas*w).sum(dim=['lon','lat']) / w.sum(dim=['lon','lat'])

regions = {
    'Arctic': dict(lat=slice(60, 90)),
    'Tropics': dict(lat=slice(-20, 20)),
    'US': dict(lat=slice(25,50), lon=slice(-125,-65)),
    'Europe': dict(lat=slice(35,70), lon=slice(-10,40)),
    'Global': {}
}

rows = []
for name, sel in regions.items():
    sub = ds.sel(**{k: v for k,v in sel.items()})
    ts = area_weighted_mean(sub).to_series().rename('temp_k')
    df = ts.to_frame()
    df['temp_c'] = df['temp_k'] - 273.15
    df['anomaly'] = df['temp_c'] - baseline
    df['region'] = name
    df = df.reset_index().rename(columns={'time':'date'})
    rows.append(df[['region','date','temp_c','anomaly']])

pd.concat(rows).to_csv('data/regional_timeseries.csv', index=False)

# 3) Grid map per year (coarsen to keep small)
coarse = ds.coarsen(lat=4, lon=4, boundary='trim').mean()  # adjust factors to taste
year = 2010
field = coarse.tas.sel(time=str(year)).isel(time=0) - 273.15
grid = field.to_dataframe().reset_index().rename(columns={'tas':'temp_c'})
grid['anomaly'] = grid['temp_c'] - baseline
grid['year'] = year
grid[['year','lat','lon','temp_c','anomaly']].to_csv('data/grid_anomaly.csv', index=False)
```

When you change `year`, append rows to the same CSV so the map slider can switch years quickly in the browser.

> Note: Keep files small for GitHub Pages; you can downsample to yearly means and coarse lat/lon.

## Run Locally
Open `index.html` with a local server (e.g., VSCode Live Server).

## Deploy
Push to a public GitHub repo and enable **GitHub Pages** (root or `/docs`).

