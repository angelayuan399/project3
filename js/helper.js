import { config, regions } from "../main.js";

export function createLegend() {
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

// Slider control
d3.select('#year-slider').on('input', function () {
    const year = +this.value;
    updateMap(year);
});

// Play/Pause animation
d3.select('#play-button').on('click', function () {
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

export function highlightRegion(regionName) {
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

export function highlightRegionBoundary(regionName, highlight) {
    d3.select(`.region-boundary.region-${regionName.replace(/\s+/g, '-')}`)
        .attr('stroke-width', highlight ? 4 : 2)
        .attr('stroke-opacity', highlight ? 1 : 0.6)
        .attr('stroke', highlight ? regions[regionName].color : '#333');
}

export function highlightAllBoundaries(state) {
    d3.selectAll('.region-boundary')
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.6)
        .attr('stroke', '#333');
}

// Tooltip functions
// Position tooltip so it doesn't overflow the viewport
// In helper.js
export function positionTooltip(event, tooltipSel) {
    const tooltip = tooltipSel || d3.select('#tooltip');
    const node = tooltip.node();
    if (!node) return;

    // By the time this runs (thanks to setTimeout), 
    // this will be the CORRECT height.
    const rect = node.getBoundingClientRect();
    
    const pageX = event.pageX;
    const pageY = event.pageY;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let left = pageX + 15; // Default: right of cursor
    let top = pageY + 15;  // Default: below cursor

    // Adjust horizontal position
    if (left + rect.width + 12 > scrollX + winW) {
        left = pageX - rect.width - 20; // Move to left
    }

    // Adjust vertical position
    if (top + rect.height + 12 > scrollY + winH) {
        // It doesn't fit below. Try above.
        const topAbove = pageY - rect.height - 15;

        if (topAbove < scrollY + 10) {
            // It fails both. Pin to top of viewport.
            top = scrollY + 10;
        } else {
            // It fits above.
            top = topAbove;
        }
    }

    // Apply the final, calculated positions
    tooltip.style('left', (left) + 'px')
           .style('top', (top) + 'px');
}

export function showTooltip(event, d) {
    const yearProgress = (currentYear - 2025) / (2100 - 2025);
    const tempAtYear = d.temp2100 * yearProgress;

    const tooltip = d3.select('#tooltip');
    tooltip.html(`
        <strong>Location:</strong> ${d.lat.toFixed(1)}°N, ${Math.abs(d.lon).toFixed(1)}°W<br>
        <strong>Temp Increase (${currentYear}):</strong> ${tempAtYear.toFixed(2)}°C
    `)
        .classed('visible', true);

    // Smart position
    positionTooltip(event, tooltip);
}

export function showRegionTooltip(event, regionName, temp) {
    const tooltip = d3.select('#tooltip');
    tooltip.html(`
        <strong>${regionName}</strong><br>
        Temperature Increase (${currentYear}): ${temp.toFixed(2)}°C<br>
        <em>Click to highlight in time series</em>
    `)
        .classed('visible', true);

    // Smart position
    positionTooltip(event, tooltip);
}

export function hideTooltip() {
    d3.select('#tooltip').classed('visible', false);
}