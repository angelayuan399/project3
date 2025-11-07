// --- Load data and set up ---
const svg = d3.select("#series");
const width = +svg.attr("width");
const height = +svg.attr("height");
const margin = { top: 30, right: 40, bottom: 40, left: 60 };

const tooltip = d3.select("#tooltip");
let currentRegion = "US";
let currentMetric = "anomaly";

// --- Scales and axes ---
const x = d3.scaleTime().range([margin.left, width - margin.right]);
const y = d3.scaleLinear().range([height - margin.bottom, margin.top]);
const color = d3.scaleOrdinal()
  .domain(["Global", "US", "Europe", "Arctic", "Tropics"])
  .range(["#3b82f6", "#ef4444", "#10b981", "#a855f7", "#f59e0b"]);

const xAxis = svg.append("g")
  .attr("transform", `translate(0,${height - margin.bottom})`);
const yAxis = svg.append("g")
  .attr("transform", `translate(${margin.left},0)`);

// --- Load CSV ---
d3.csv("data/regional_timeseries.csv", d3.autoType).then(data => {
  data.forEach(d => d.date = new Date(d.date));

  // Initialize
  updateSeries(data);

  // Handle region buttons
  d3.selectAll(".regions button").on("click", (event) => {
    currentRegion = event.currentTarget.dataset.region;
    updateSeries(data);
  });

  // Handle metric change
  d3.select("#metric").on("change", (event) => {
    currentMetric = event.target.value;
    updateSeries(data);
  });
});

// --- Update function for line chart ---
function updateSeries(data) {
  const filtered = data.filter(d => d.region === currentRegion);
  const xExtent = d3.extent(filtered, d => d.date);
  const yExtent = d3.extent(filtered, d => d[currentMetric]);

  x.domain(xExtent);
  y.domain([yExtent[0] - 0.2, yExtent[1] + 0.2]);

  xAxis.call(d3.axisBottom(x).ticks(8));
  yAxis.call(d3.axisLeft(y).ticks(6));

  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d[currentMetric]))
    .curve(d3.curveMonotoneX);

  const linePath = svg.selectAll(".line").data([filtered]);
  linePath.join("path")
    .attr("class", "line")
    .attr("stroke", color(currentRegion))
    .attr("stroke-width", 2.5)
    .attr("fill", "none")
    .transition().duration(600)
    .attr("d", line);

  svg.selectAll(".region-label").data([currentRegion])
    .join("text")
    .attr("class", "region-label")
    .attr("x", width - 100)
    .attr("y", margin.top + 10)
    .attr("text-anchor", "start")
    .attr("font-weight", "bold")
    .attr("fill", color(currentRegion))
    .text(currentRegion);

  d3.select("#series-legend").html(
    `<span style="color:${color(currentRegion)}">■</span> ${currentRegion} (${currentMetric})`
  );
}
