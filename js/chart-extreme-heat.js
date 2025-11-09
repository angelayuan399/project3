import { extremeHeatConfig, generateExtremeHeatData, regions } from "../main.js";
import { positionTooltip } from "./helper.js";

export function createExtremeHeatChart() {
    const container = d3.select('main');

    // Add new section after the time series chart
    const chartSection = container.insert('div', 'main + *')
        .attr('class', 'chart-container')
        .style('margin-top', '30px');

    chartSection.append('h2')
        .text('Extreme Heat Days Projection')
        .style('color', '#2d3748')
        .style('margin-bottom', '10px');

    chartSection.append('p')
        .attr('class', 'chart-subtitle')
        .text('Annual days exceeding critical temperature thresholds - Select threshold and region to explore');

    // Add controls
    const controlsDiv = chartSection.append('div')
        .style('display', 'flex')
        .style('gap', '20px')
        .style('margin-bottom', '20px')
        .style('justify-content', 'center')
        .style('flex-wrap', 'wrap');

    // Threshold selector
    const thresholdGroup = controlsDiv.append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '8px');

    thresholdGroup.append('label')
        .style('font-weight', '600')
        .style('color', '#2d3748')
        .text('Temperature Threshold:');

    const thresholdSelect = thresholdGroup.append('select')
        .attr('id', 'threshold-select')
        .style('padding', '8px 16px')
        .style('border', '2px solid #e2e8f0')
        .style('border-radius', '8px')
        .style('font-size', '1em')
        .style('cursor', 'pointer')
        .style('background', 'white');

    thresholdSelect.selectAll('option')
        .data([
            { value: 'moderate', label: 'Moderate Heat (>95°F / 35°C)' },
            { value: 'severe', label: 'Severe Heat (>100°F / 38°C)' },
            { value: 'extreme', label: 'Extreme Heat (>105°F / 41°C)' }
        ])
        .join('option')
        .attr('value', d => d.value)
        .text(d => d.label);

    // Region selector for heat chart
    const regionGroup = controlsDiv.append('div')
        .style('display', 'flex')
        .style('flex-direction', 'column')
        .style('gap', '8px');

    regionGroup.append('label')
        .style('font-weight', '600')
        .style('color', '#2d3748')
        .text('Focus Region:');

    const regionSelect = regionGroup.append('select')
        .attr('id', 'heat-region-select')
        .style('padding', '8px 16px')
        .style('border', '2px solid #e2e8f0')
        .style('border-radius', '8px')
        .style('font-size', '1em')
        .style('cursor', 'pointer')
        .style('background', 'white');

    regionSelect.selectAll('option')
        .data(['All Regions', ...Object.keys(regions)])
        .join('option')
        .attr('value', d => d)
        .text(d => d);

    // Create SVG
    const svg = chartSection.append('svg')
        .attr('id', 'extreme-heat-chart')
        .attr('viewBox', `0 0 ${extremeHeatConfig.width} ${extremeHeatConfig.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const { width, height, margin } = extremeHeatConfig;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)

    // Generate data
    const heatData = generateExtremeHeatData();

    // Scales
    const xScale = d3.scaleLinear()
        .domain([2025, 2100])
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain([0, 250])
        .range([innerHeight, 0]);

    // Grid
    g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale)
            .ticks(10)
            .tickSize(-innerWidth)
            .tickFormat(''));

    // Axes
    const xAxis = g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(10).tickFormat(d3.format('d')));

    const yAxis = g.append('g')
        .call(d3.axisLeft(yScale).ticks(10));

    // Axis labels
    g.append('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 45)
        .attr('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .style('fill', '#2d3748')
        .text('Year');

    const yAxisLabel = g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -55)
        .attr('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .style('fill', '#2d3748')
        .attr('id', 'heat-y-label')
        .text('Days per Year Above Moderate Heat Threshold (>95°F)');

    // Line generator
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.days))
        .curve(d3.curveMonotoneX);

    // Lines container
    const linesGroup = g.append('g').attr('class', 'heat-lines-group');

    // Update function
    function updateHeatChart() {
        const selectedThreshold = d3.select('#threshold-select').property('value');
        const selectedRegion = d3.select('#heat-region-select').property('value');

        // Update y-axis label
        const thresholdLabels = {
            moderate: 'Days per Year Above Moderate Heat (>95°F / 35°C)',
            severe: 'Days per Year Above Severe Heat (>100°F / 38°C)',
            extreme: 'Days per Year Above Extreme Heat (>105°F / 41°C)'
        };
        d3.select('#heat-y-label').text(thresholdLabels[selectedThreshold]);

        // Filter data
        const filtered = heatData.filter(d => d.threshold === selectedThreshold);
        const grouped = d3.groups(filtered, d => d.region);

        // Update y-scale domain based on data
        const maxDays = d3.max(filtered, d => d.days);
        yScale.domain([0, Math.ceil(maxDays * 1.1)]);
        yAxis.transition().duration(800).call(d3.axisLeft(yScale).ticks(10));

        // Update grid
        g.select('.grid')
            .transition()
            .duration(800)
            .call(d3.axisLeft(yScale)
                .ticks(10)
                .tickSize(-innerWidth)
                .tickFormat(''));

        // Update lines
        const lines = linesGroup.selectAll('.heat-line')
            .data(grouped, d => d[0]);

        lines.exit()
            .transition()
            .duration(400)
            .style('opacity', 0)
            .remove();

        const linesEnter = lines.enter()
            .append('path')
            .attr('class', 'heat-line')
            .attr('fill', 'none')
            .attr('stroke-width', 3)
            .style('opacity', 0);

        lines.merge(linesEnter)
            .transition()
            .duration(800)
            .attr('d', d => line(d[1]))
            .attr('stroke', d => d[1][0].color)
            .style('opacity', d => {
                if (selectedRegion === 'All Regions') return 0.8;
                return d[0] === selectedRegion ? 1 : 0.15;
            })
            .attr('stroke-width', d => {
                if (selectedRegion === 'All Regions') return 3;
                return d[0] === selectedRegion ? 4 : 2;
            });

        // Add hover effects
        linesGroup.selectAll('.heat-line')
            .on('mouseover', function (event, d) {
                const regionData = d[1];
                const finalDays = regionData[regionData.length - 1].days;
                const initialDays = regionData[0].days;
                const increase = ((finalDays / initialDays - 1) * 100).toFixed(0);

                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('stroke-width', 5)
                    .style('opacity', 1);

                const tooltip = d3.select('#tooltip');
                tooltip.html(`
                    <strong>${d[0]}</strong><br/>
                    2025: ${initialDays} days<br/>
                    2100: <strong>${finalDays} days</strong><br/>
                    Increase: +${increase}%<br/>
                    <em>Threshold: ${thresholdLabels[selectedThreshold]}</em>
                `)
                    .classed('visible', true);

                setTimeout(() => {
                    // Pass the original 'event' to the function
                    positionTooltip(event, tooltip);
                }, 0);
            })
            .on('mousemove', function (event) {
                if (typeof positionTooltip === 'function') {
                    positionTooltip(event, d3.select('#tooltip'));
                }
            })
            .on('mouseout', function (event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('stroke-width', selectedRegion === 'All Regions' || d[0] === selectedRegion ? 3 : 2)
                    .style('opacity', selectedRegion === 'All Regions' ? 0.8 : (d[0] === selectedRegion ? 1 : 0.15));

                d3.select('#tooltip').classed('visible', false);
            });

        // Update end labels
        const labels = g.selectAll('.heat-end-label')
            .data(grouped, d => d[0]);

        labels.exit().remove();

        const labelsEnter = labels.enter()
            .append('text')
            .attr('class', 'heat-end-label region-label')
            .attr('x', innerWidth + 5)
            .attr('dy', '0.35em')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('opacity', 0);

        labels.merge(labelsEnter)
            .transition()
            .duration(800)
            .attr('y', d => yScale(d[1][d[1].length - 1].days))
            .attr('fill', d => d[1][0].color)
            .style('opacity', d => {
                if (selectedRegion === 'All Regions') return 1;
                return d[0] === selectedRegion ? 1 : 0.3;
            })
            .text(d => `${d[0]} (${d[1][d[1].length - 1].days}d)`);
    }

    // Event listeners
    d3.select('#threshold-select').on('change', updateHeatChart);
    d3.select('#heat-region-select').on('change', updateHeatChart);

    // Initial render
    updateHeatChart();
}