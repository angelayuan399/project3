# US Temperature Increase Visualization - D3.js

An interactive visualization showing how extreme temperature increases across US regions will evolve from 2025 to 2100 under high emissions scenarios.

## 🎯 Features

### Interactive Temperature Map
- **Color-coded heat map** showing temperature increases across the US
- Darker red = more extreme warming (up to 7°C)
- Yellow/light orange = less extreme warming (2-3°C)

### Time Slider (2025-2100)
- Drag the slider to see how warming evolves decade by decade
- Watch the colors intensify as you move forward in time
- **Play button** to animate through the decades automatically

### Regional Time Series Chart
- Shows 5 different US regions and their warming trajectories
- **Click on a region** in the map OR on a line to highlight it
- See how warming accelerates mid-century (2040-2070)

### Interactive Tooltips
- **Hover over the map** to see exact temperatures for any location
- **Hover over region boundaries** to see region-specific data
- **Hover over time series lines** to see region details

## 📁 Files

- `index.html` - Main HTML structure
- `styles.css` - All styling and layout
- `script.js` - D3.js visualization code (pure D3, no other libraries!)

## 🚀 How to Run

### Option 1: Local Development
```bash
# Navigate to the directory
cd /path/to/outputs

# Start a simple HTTP server
python -m http.server 8000

# Then open: http://localhost:8000
```

### Option 2: GitHub Pages
1. Create a new GitHub repository
2. Upload these three files: `index.html`, `styles.css`, `script.js`
3. Go to Settings → Pages
4. Select main branch → Save
5. Your site will be live at: `https://yourusername.github.io/repo-name`

### Option 3: Open Directly
Just open `index.html` in your web browser!

## 🎮 How to Use

1. **Drag the time slider** to see how warming evolves from 2025 to 2100
2. **Click "Play Animation"** to watch decades pass automatically
3. **Hover over the map** to see exact temperatures
4. **Click on regions** to highlight them in both visualizations

## 📊 Key Insights

- **Southwest Interior**: Most extreme warming (~5.5°C by 2100)
- **Great Plains**: Significant warming (~5.0°C by 2100)
- **Pacific Northwest**: Moderate warming (~4.0°C by 2100)
- **Coastal Regions**: Least extreme (~3.5°C by 2100)
- **Mid-Century Acceleration**: All regions show faster warming 2040-2070

## 🎓 For Your Project

✅ **D3.js Only**: No Vega-Lite, Plotly, or other high-level libraries
✅ **Interactive Exploration**: Time slider, region selection, tooltips
✅ **Visual Encodings**: Color (temperature), position (geography), line (time)
✅ **Data Transformations**: Temporal interpolation, spatial aggregation
✅ **Loads from Static Data**: All data generated in JavaScript

Perfect for your Project 3 submission!
