import { getTemperature, mapData, config, regions } from "../main.js";
import { highlightRegion, showTooltip, showRegionTooltip, hideTooltip } from "./helper.js";

let currentYear = 2100;
let isPlaying = false;
let playInterval;

export function createTemperatureMap() {
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

    // Caption for map
    d3.select('#map-container').append('p')
        .attr('class', 'chart-caption')
        .text('Spatial representation of projected temperature increase by 2100. Hover cells for local values and click regions to view regional time series.');
}

export function updateMap(year) {
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