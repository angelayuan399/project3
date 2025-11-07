// ===================================================================
// US Temperature Increase Visualization
// Using D3.js to show climate change projections
// ===================================================================

// Configuration
const config = {
    map: {
        width: 1200,
        height: 600,
        margin: { top: 20, right: 20, bottom: 20, left: 20 }
    },
    timeSeries: {
        width: 1200,
        height: 400,
        margin: { top: 30, right: 120, bottom: 50, left: 60 }
    },
    colorScale: {
        domain: [0, 2, 3, 4, 5, 6, 7],
        range: ['#FFFFCC', '#FFEDA0', '#FED976', '#FEB24C', '#FD8D3C', '#FC4E2A', '#E31A1C', '#BD0026']
    }
};

// Data: US regions and their temperature increases over time
const regions = {
    'Southwest Interior': {
        color: '#8B0000',
        coordinates: [
            [-115, 34], [-115, 32], [-113, 31], [-110, 31], [-108, 31],
            [-106, 32], [-106, 34], [-105, 37], [-110, 37], [-113, 37], [-115, 36]
        ]
    },
    'Great Plains': {
        color: '#FF4500',
        coordinates: [
            [-105, 37], [-105, 42], [-102, 45], [-98, 45], [-95, 43],
            [-95, 40], [-98, 38], [-102, 37], [-105, 37]
        ]
    },
    'Pacific Northwest': {
        color: '#FF8C00',
        coordinates: [
            [-125, 42], [-125, 49], [-120, 49], [-117, 46], [-120, 42], [-125, 42]
        ]
    },
    'Southeast Coast': {
        color: '#FFA500',
        coordinates: [
            [-90, 30], [-85, 30], [-80, 28], [-75, 32], [-80, 35],
            [-85, 33], [-90, 32], [-90, 30]
        ]
    },
    'Northeast Coast': {
        color: '#FFD700',
        coordinates: [
            [-80, 38], [-75, 38], [-70, 41], [-70, 45], [-75, 45],
            [-78, 42], [-80, 40], [-80, 38]
        ]
    }
};

// Generate temperature data for each region over time
function generateTemperatureData(regionName, finalTemp, rate) {
    const years = d3.range(2025, 2101);
    return years.map((year, i) => {
        const progress = i / years.length;
        let warmingFactor;
        
        if (progress < 0.3) {
            warmingFactor = progress * 0.8;
        } else if (progress < 0.7) {
            warmingFactor = 0.24 + (progress - 0.3) * 1.4;
        } else {
            warmingFactor = 0.8 + (progress - 0.7) * 0.7;
        }
        
        const temp = finalTemp * warmingFactor * rate / 1.1;
        const noise = (Math.sin(i * 0.5) * 0.15);
        
        return {
            year: year,
            temp: Math.max(0, temp + noise),
            region: regionName
        };
    });
}

// Temperature data by region
const temperatureData = {
    'Southwest Interior': generateTemperatureData('Southwest Interior', 5.5, 1.2),
    'Great Plains': generateTemperatureData('Great Plains', 5.0, 1.1),
    'Pacific Northwest': generateTemperatureData('Pacific Northwest', 4.0, 1.0),
    'Southeast Coast': generateTemperatureData('Southeast Coast', 3.5, 0.9),
    'Northeast Coast': generateTemperatureData('Northeast Coast', 3.8, 0.95)
};

// Get temperature for a region at a specific year
function getTemperature(regionName, year) {
    const data = temperatureData[regionName];
    const point = data.find(d => d.year === year);
    return point ? point.temp : 0;
}

// Generate grid data for the map
function generateMapData() {
    const data = [];
    const latRange = d3.range(25, 50.5, 0.8);
    const lonRange = d3.range(-125, -64.5, 1);
    
    latRange.forEach(lat => {
        lonRange.forEach(lon => {
            let temp = 3.5; // base
            
            // Interior effect
            const distWest = Math.min(Math.abs(lon + 125), 10) / 10;
            const distEast = Math.min(Math.abs(lon + 65), 10) / 10;
            temp += Math.min(distWest, distEast) * 1.5;
            
            // Latitude effect
            temp += (lat - 25) / 25 * 0.8;
            
            // Southwest hotspot
            if (lon > -115 && lon < -103 && lat > 31 && lat < 37) {
                temp += 1.2;
            }
            
            // Great Plains
            if (lon > -105 && lon < -95 && lat > 35 && lat < 45) {
                temp += 0.8;
            }
            
            // Noise
            temp += (Math.sin(lat * 10) * Math.cos(lon * 10)) * 0.2;
            
            data.push({
                lat: lat,
                lon: lon,
                temp2100: Math.max(2, Math.min(7, temp))
            });
        });
    });
    
    return data;
}

const mapData = generateMapData();

// ===================================================================
// TEMPERATURE MAP
// ===================================================================

function createTemperatureMap() {
    const svg = d3.select('#temperature-map')
        .attr('viewBox', `0 0 ${config.map.width} ${config.map.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    
    // Scales
    const xScale = d3.scaleLinear()
        .domain([-125, -65])
        .range([config.map.margin.left, config.map.width - config.map.margin.right]);
    
    const yScale = d3.scaleLinear()
        .domain([25, 50])
        .range([config.map.height - config.map.margin.bottom, config.map.margin.top]);
    
    const colorScale = d3.scaleLinear()
        .domain(config.colorScale.domain)
        .range(config.colorScale.range)
        .clamp(true);
    
    // Create map group
    const mapGroup = svg.append('g')
        .attr('class', 'map-group');
    
    // Draw temperature grid
    const cells = mapGroup.selectAll('.temp-cell')
        .data(mapData)
        .join('rect')
        .attr('class', 'temp-cell')
        .attr('x', d => xScale(d.lon))
        .attr('y', d => yScale(d.lat))
        .attr('width', Math.abs(xScale(-124) - xScale(-125)))
        .attr('height', Math.abs(yScale(25) - yScale(26)))
        .attr('fill', d => colorScale(d.temp2100 * 0.01)) // Start at near-zero
        .attr('stroke', 'none')
        .on('mouseover', function(event, d) {
            showTooltip(event, d);
        })
        .on('mouseout', hideTooltip);
    
    // Draw region boundaries
    const regionGroup = svg.append('g')
        .attr('class', 'regions');
    
    Object.entries(regions).forEach(([name, region]) => {
        const path = d3.line()
            .x(d => xScale(d[0]))
            .y(d => yScale(d[1]))
            .curve(d3.curveCardinalClosed);
        
        regionGroup.append('path')
            .datum(region.coordinates)
            .attr('d', path)
            .attr('fill', 'none')
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.6)
            .attr('class', `region-boundary region-${name.replace(/\s+/g, '-')}`)
            .style('cursor', 'pointer')
            .on('click', function() {
                highlightRegion(name);
            })
            .on('mouseover', function(event) {
                d3.select(this).attr('stroke-width', 3);
                const temp = getTemperature(name, currentYear);
                showRegionTooltip(event, name, temp);
            })
            .on('mouseout', function() {
                d3.select(this).attr('stroke-width', 2);
                hideTooltip();
            });
    });
    
    // Add axes
    const xAxis = d3.axisBottom(xScale)
        .ticks(6)
        .tickFormat(d => `${Math.abs(d)}°W`);
    
    const yAxis = d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => `${d}°N`);
    
    svg.append('g')
        .attr('transform', `translate(0,${config.map.height - config.map.margin.bottom})`)
        .call(xAxis)
        .selectAll('text')
        .style('font-size', '12px');
    
    svg.append('g')
        .attr('transform', `translate(${config.map.margin.left},0)`)
        .call(yAxis)
        .selectAll('text')
        .style('font-size', '12px');
    
    // Store for updates
    window.mapCells = cells;
    window.mapColorScale = colorScale;
}

// ===================================================================
// TIME SERIES CHART
// ===================================================================

function createTimeSeriesChart() {
    const svg = d3.select('#time-series')
        .attr('viewBox', `0 0 ${config.timeSeries.width} ${config.timeSeries.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');
    
    const { width, height, margin } = config.timeSeries;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Scales
    const xScale = d3.scaleLinear()
        .domain([2025, 2100])
        .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
        .domain([0, 6.5])
        .range([innerHeight, 0]);
    
    // Grid
    g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale)
            .ticks(7)
            .tickSize(-innerWidth)
            .tickFormat(''));
    
    // Axes
    const xAxis = g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(8).tickFormat(d3.format('d')));
    
    const yAxis = g.append('g')
        .call(d3.axisLeft(yScale).ticks(7));
    
    // Axis labels
    g.append('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 40)
        .attr('text-anchor', 'middle')
        .text('Year');
    
    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -45)
        .attr('text-anchor', 'middle')
        .text('Temperature Increase (°C)');
    
    // Threshold lines
    [2, 4].forEach(threshold => {
        g.append('line')
            .attr('class', 'threshold-line')
            .attr('x1', 0)
            .attr('x2', innerWidth)
            .attr('y1', yScale(threshold))
            .attr('y2', yScale(threshold));
        
        g.append('text')
            .attr('class', 'threshold-label')
            .attr('x', 5)
            .attr('y', yScale(threshold) - 5)
            .text(`${threshold}°C threshold`);
    });
    
    // Line generator
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.temp))
        .curve(d3.curveMonotoneX);
    
    // Draw lines for each region
    Object.entries(temperatureData).forEach(([regionName, data]) => {
        const regionColor = regions[regionName].color;
        
        // Line
        g.append('path')
            .datum(data)
            .attr('class', `region-line region-line-${regionName.replace(/\s+/g, '-')}`)
            .attr('d', line)
            .attr('stroke', regionColor)
            .attr('data-region', regionName)
            .on('click', function() {
                highlightRegion(regionName);
            })
            .on('mouseover', function(event) {
                d3.select(this).classed('highlighted', true);
                highlightRegionBoundary(regionName, true);
            })
            .on('mouseout', function() {
                if (!this.classList.contains('user-highlighted')) {
                    d3.select(this).classed('highlighted', false);
                    highlightRegionBoundary(regionName, false);
                }
            });
        
        // End label
        const lastPoint = data[data.length - 1];
        g.append('text')
            .attr('class', 'region-label')
            .attr('x', innerWidth + 5)
            .attr('y', yScale(lastPoint.temp))
            .attr('dy', '0.35em')
            .attr('fill', regionColor)
            .text(`${regionName} (${lastPoint.temp.toFixed(1)}°C)`);
    });
    
    // Year marker (will be updated by slider)
    window.yearMarker = g.append('line')
        .attr('class', 'year-marker')
        .attr('x1', xScale(2100))
        .attr('x2', xScale(2100))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .style('opacity', 0);
    
    window.timeSeriesXScale = xScale;
    window.timeSeriesYScale = yScale;
}

// ===================================================================
// LEGEND
// ===================================================================

function createLegend() {
    const svg = d3.select('#legend-svg');
    const width = 800;
    const height = 80;
    
    svg.attr('viewBox', `0 0 ${width} ${height}`)
       .attr('preserveAspectRatio', 'xMidYMid meet');
    
    const colorScale = d3.scaleLinear()
        .domain(config.colorScale.domain)
        .range(config.colorScale.range);
    
    const legendWidth = 600;
    const legendHeight = 30;
    const legendX = 100;
    const legendY = 20;
    
    // Gradient
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
        .attr('id', 'temp-gradient');
    
    config.colorScale.domain.forEach((value, i) => {
        const percent = (i / (config.colorScale.domain.length - 1)) * 100;
        gradient.append('stop')
            .attr('offset', `${percent}%`)
            .attr('stop-color', config.colorScale.range[i]);
    });
    
    // Legend bar
    svg.append('rect')
        .attr('x', legendX)
        .attr('y', legendY)
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#temp-gradient)')
        .style('stroke', '#333')
        .style('stroke-width', 1);
    
    // Scale
    const legendScale = d3.scaleLinear()
        .domain([0, 7])
        .range([legendX, legendX + legendWidth]);
    
    const legendAxis = d3.axisBottom(legendScale)
        .ticks(8)
        .tickFormat(d => `${d}°C`);
    
    svg.append('g')
        .attr('transform', `translate(0,${legendY + legendHeight})`)
        .call(legendAxis)
        .selectAll('text')
        .style('font-size', '12px');
}

// ===================================================================
// INTERACTIVITY
// ===================================================================

let currentYear = 2100;
let isPlaying = false;
let playInterval;

// Update map for a specific year
function updateMap(year) {
    currentYear = year;
    const yearProgress = (year - 2025) / (2100 - 2025);
    
    window.mapCells.transition()
        .duration(300)
        .attr('fill', d => window.mapColorScale(d.temp2100 * yearProgress));
    
    // Update year marker
    if (window.yearMarker && window.timeSeriesXScale) {
        window.yearMarker
            .style('opacity', 1)
            .transition()
            .duration(300)
            .attr('x1', window.timeSeriesXScale(year))
            .attr('x2', window.timeSeriesXScale(year));
    }
    
    d3.select('#current-year').text(year);
}

// Slider control
d3.select('#year-slider').on('input', function() {
    const year = +this.value;
    updateMap(year);
});

// Play/Pause animation
d3.select('#play-button').on('click', function() {
    if (isPlaying) {
        stopAnimation();
    } else {
        startAnimation();
    }
});

function startAnimation() {
    isPlaying = true;
    d3.select('#play-button').text('⏸ Pause');
    
    let year = currentYear;
    if (year >= 2100) year = 2025;
    
    playInterval = setInterval(() => {
        year += 5;
        if (year > 2100) {
            year = 2025;
        }
        
        d3.select('#year-slider').property('value', year);
        updateMap(year);
    }, 500);
}

function stopAnimation() {
    isPlaying = false;
    clearInterval(playInterval);
    d3.select('#play-button').text('▶ Play Animation');
}

// Highlight region
let selectedRegion = null;

function highlightRegion(regionName) {
    selectedRegion = regionName;
    
    // Highlight line
    d3.selectAll('.region-line')
        .classed('dimmed', true)
        .classed('user-highlighted', false);
    
    d3.select(`.region-line-${regionName.replace(/\s+/g, '-')}`)
        .classed('dimmed', false)
        .classed('highlighted', true)
        .classed('user-highlighted', true);
    
    // Highlight boundary
    highlightAllBoundaries(false);
    highlightRegionBoundary(regionName, true);
}

function highlightRegionBoundary(regionName, highlight) {
    d3.select(`.region-boundary.region-${regionName.replace(/\s+/g, '-')}`)
        .attr('stroke-width', highlight ? 4 : 2)
        .attr('stroke-opacity', highlight ? 1 : 0.6)
        .attr('stroke', highlight ? regions[regionName].color : '#333');
}

function highlightAllBoundaries(state) {
    d3.selectAll('.region-boundary')
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.6)
        .attr('stroke', '#333');
}

// Tooltip functions
function showTooltip(event, d) {
    const yearProgress = (currentYear - 2025) / (2100 - 2025);
    const tempAtYear = d.temp2100 * yearProgress;
    
    const tooltip = d3.select('#tooltip');
    tooltip.html(`
        <strong>Location:</strong> ${d.lat.toFixed(1)}°N, ${Math.abs(d.lon).toFixed(1)}°W<br>
        <strong>Temp Increase (${currentYear}):</strong> ${tempAtYear.toFixed(2)}°C
    `)
    .style('left', (event.pageX + 15) + 'px')
    .style('top', (event.pageY - 15) + 'px')
    .classed('visible', true);
}

function showRegionTooltip(event, regionName, temp) {
    const tooltip = d3.select('#tooltip');
    tooltip.html(`
        <strong>${regionName}</strong><br>
        Temperature Increase (${currentYear}): ${temp.toFixed(2)}°C<br>
        <em>Click to highlight in time series</em>
    `)
    .style('left', (event.pageX + 15) + 'px')
    .style('top', (event.pageY - 15) + 'px')
    .classed('visible', true);
}

function hideTooltip() {
    d3.select('#tooltip').classed('visible', false);
}

// ===================================================================
// INITIALIZE
// ===================================================================

document.addEventListener('DOMContentLoaded', function() {
    createTemperatureMap();
    createTimeSeriesChart();
    createLegend();
    updateMap(2100); // Start at end state
});
