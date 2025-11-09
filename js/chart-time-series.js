// ===================================================================
// REPLACE - GENERATES SAMPLE
// ===================================================================
import { temperatureData, config, regions } from "../main.js";
import { highlightRegion, highlightRegionBoundary } from "./helper.js";
// ===================================================================

export function createTimeSeriesChart() {
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

    // Caption for time series
    const tsContainer = d3.select(d3.select('#time-series').node().parentNode);
    tsContainer.append('p')
        .attr('class', 'chart-caption')
        .text('Regional temperature trajectories from 2025 to 2100. Click a region on the map to highlight its line. Threshold lines mark important policy-relevant levels.');
}