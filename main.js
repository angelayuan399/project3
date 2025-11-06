// CMIP6 D3 starter — only D3 (plus topojson for world map).
// Data files expected in /data:
// 1) global_timeseries.csv: date,temp_c,anomaly
// 2) regional_timeseries.csv: region,date,temp_c,anomaly
// 3) grid_anomaly.csv: year,lat,lon,temp_c,anomaly (coarse grid recommended, e.g., 2.5°)
//
// Replace the sample CSVs with your exports. See README for Python prep.
//
// ---- Layout handles ----
const mapSvg = d3.select('#map');
const seriesSvg = d3.select('#series');
const yearInput = d3.select('#year');
const yearValue = d3.select('#year-value');
const metricSel = d3.select('#metric');
const tooltip = d3.select('#tooltip');

// ---- Sizes ----
const mapWidth = +mapSvg.attr('width');
const mapHeight = +mapSvg.attr('height');
const seriesWidth = +seriesSvg.attr('width');
const seriesHeight = +seriesSvg.attr('height');
const margin = {top: 28, right: 16, bottom: 30, left: 46};

// ---- Projections & paths ----
const projection = d3.geoNaturalEarth1().fitSize([mapWidth, mapHeight], {type:'Sphere'});
const geoPath = d3.geoPath(projection);

// ---- Scales ----
const color = d3.scaleSequential(d3.interpolateRdYlBu).domain([2.5, -2.5]); // blue=cool, red=warm

const x = d3.scaleUtc().range([margin.left, seriesWidth - margin.right]);
const y = d3.scaleLinear().range([seriesHeight - margin.bottom, margin.top]);

// ---- State ----
let world, countries;
let globalTS = [], regionalTS = [], gridData = [];
let currentYear = +yearInput.node().value;
let currentMetric = metricSel.node().value;
let currentRegion = 'Global';

// ---- Load data ----
Promise.all([
  d3.json('https://unpkg.com/world-atlas@2/countries-110m.json'),
  d3.csv('data/global_timeseries.csv', d3.autoType),
  d3.csv('data/regional_timeseries.csv', d3.autoType),
  d3.csv('data/grid_anomaly.csv', d3.autoType)
]).then(([worldTopo, gts, rts, grid]) => {
  world = worldTopo;
  countries = topojson.feature(world, world.objects.countries);
  globalTS = gts;
  regionalTS = rts;
  gridData = grid;

  // Infer year range from grid
  const years = Array.from(new Set(gridData.map(d => d.year))).sort((a,b)=>a-b);
  if (years.length) {
    yearInput.attr('min', d3.min(years)).attr('max', d3.max(years)).attr('value', d3.max(years));
    currentYear = +yearInput.node().value;
    yearValue.text(currentYear);
  }

  initMap();
  renderMap();
  initSeries();
  renderSeries();
});

// ---- Map ----
function initMap() {
  // Draw graticule and land
  const g = mapSvg.append('g');
  g.append('path').attr('class','sphere').attr('d', geoPath({type:'Sphere'})).attr('fill','#eef3f7').attr('stroke','#cbd5e1');

  mapSvg.append('g')
    .selectAll('path.country')
    .data(countries.features)
    .join('path')
    .attr('class','country')
    .attr('d', geoPath)
    .attr('fill', '#f8fafc')
    .attr('stroke', '#cbd5e1')
    .attr('stroke-width', 0.5);

  // Grid container
  mapSvg.append('g').attr('id', 'grid-layer');
  buildLegend();
}

function renderMap() {
  const gridForYear = gridData.filter(d => d.year === currentYear);
  const gridLayer = mapSvg.select('#grid-layer');

  const cells = gridLayer.selectAll('rect.grid-cell')
    .data(gridForYear, d => `${d.lat},${d.lon}`);

  cells.join(
    enter => enter.append('rect')
      .attr('class','grid-cell')
      .attr('x', d => projection([d.lon, d.lat])[0])
      .attr('y', d => projection([d.lon, d.lat])[1])
      .attr('width', 2.2) // visual cell size; tune for your grid spacing
      .attr('height', 2.2)
      .attr('fill', d => color(d[currentMetric]))
      .on('mousemove', (event, d) => {
        tooltip.style('opacity', 1)
          .style('left', `${event.clientX+12}px`)
          .style('top', `${event.clientY+12}px`)
          .html(`<b>${currentYear}</b><br>lat ${d.lat.toFixed(2)}, lon ${d.lon.toFixed(2)}<br>${currentMetric}: ${d[currentMetric].toFixed(2)}°C`);
      })
      .on('mouseleave', () => tooltip.style('opacity', 0)),
    update => update
      .transition().duration(250)
      .attr('fill', d => color(d[currentMetric])),
    exit => exit.remove()
  );
}

function buildLegend() {
  const legend = d3.select('#legend');
  const stops = d3.range(-2.5, 2.6, 0.5);
  const sw = 22, sh = 10;

  const wrap = legend.append('div').style('display','flex').style('align-items','center').style('gap','6px');
  stops.forEach(v => {
    wrap.append('div')
      .style('width', `${sw}px`)
      .style('height', `${sh}px`)
      .style('background', color(v));
  });
  legend.append('div').text('cool  →  warm');
}

// ---- Series ----
function initSeries() {
  seriesSvg.append('g').attr('class','x axis')
    .attr('transform', `translate(0,${seriesHeight - margin.bottom})`);
  seriesSvg.append('g').attr('class','y axis')
    .attr('transform', `translate(${margin.left},0)`);
}

function renderSeries() {
  const parseDate = d3.utcParse('%Y-%m-%d');
  const gData = globalTS.map(d => ({date: parseDate(d.date), value: d[currentMetric]}));

  const rData = regionalTS
    .filter(d => d.region === currentRegion)
    .map(d => ({date: parseDate(d.date), value: d[currentMetric]}));

  const allDates = d3.extent(gData, d => d.date);
  const allVals = d3.extent([...gData, ...rData], d => d.value);

  x.domain(allDates);
  y.domain([allVals[0]-0.2, allVals[1]+0.2]);

  const xAxis = d3.axisBottom(x).ticks(8);
  const yAxis = d3.axisLeft(y).ticks(6);

  seriesSvg.select('.x.axis').call(xAxis);
  seriesSvg.select('.y.axis').call(yAxis);

  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value));

  // Global line
  seriesSvg.selectAll('path.line.global')
    .data([gData])
    .join('path')
    .attr('class','line global')
    .attr('stroke', '#0ea5e9')
    .attr('d', line);

  // Regional line
  seriesSvg.selectAll('path.line.region')
    .data([rData])
    .join('path')
    .attr('class','line region')
    .attr('stroke', '#ef4444')
    .attr('d', line);

  d3.select('#series-legend').html(`<span style="color:#0ea5e9">■</span> Global &nbsp; <span style="color:#ef4444">■</span> ${currentRegion}`);
}

// ---- Event wiring ----
yearInput.on('input', (event) => {
  currentYear = +event.target.value;
  yearValue.text(currentYear);
  renderMap();
});

metricSel.on('change', (event) => {
  currentMetric = event.target.value;
  renderMap();
  renderSeries();
});

d3.selectAll('.regions button').on('click', (event) => {
  currentRegion = event.currentTarget.dataset.region;
  renderSeries();
});
