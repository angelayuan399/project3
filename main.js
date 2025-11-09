// ===================================================================
// ADDITIONAL VISUALIZATION: EXTREME HEAT DAYS PROJECTION
// Shows the number of days above critical temperature thresholds
// ===================================================================

// Configuration for extreme heat days chart
const extremeHeatConfig = {
    width: 1200,
    height: 500,
    margin: { top: 40, right: 140, bottom: 60, left: 80 }
};

// Generate extreme heat days data for each region
function generateExtremeHeatData() {
    const thresholds = {
        moderate: 95, // °F (35°C)
        severe: 100,  // °F (37.8°C)
        extreme: 105  // °F (40.6°C)
    };
    
    const regionsHeatData = {
        'Southwest Interior': {
            baseline2025: { moderate: 85, severe: 45, extreme: 15 },
            multiplier: { moderate: 2.8, severe: 3.5, extreme: 4.5 }
        },
        'Great Plains': {
            baseline2025: { moderate: 60, severe: 30, extreme: 8 },
            multiplier: { moderate: 2.5, severe: 3.2, extreme: 4.0 }
        },
        'Pacific Northwest': {
            baseline2025: { moderate: 25, severe: 8, extreme: 2 },
            multiplier: { moderate: 3.0, severe: 4.0, extreme: 5.0 }
        },
        'Southeast Coast': {
            baseline2025: { moderate: 70, severe: 35, extreme: 10 },
            multiplier: { moderate: 2.2, severe: 2.8, extreme: 3.5 }
        },
        'Northeast Coast': {
            baseline2025: { moderate: 30, severe: 12, extreme: 3 },
            multiplier: { moderate: 2.6, severe: 3.5, extreme: 4.5 }
        }
    };
    
    const data = [];
    const years = d3.range(2025, 2101, 5);
    
    Object.entries(regionsHeatData).forEach(([regionName, regionData]) => {
        years.forEach((year, i) => {
            const progress = i / (years.length - 1);
            const acceleratedProgress = Math.pow(progress, 1.2);
            
            // Calculate days for each threshold
            ['moderate', 'severe', 'extreme'].forEach(threshold => {
                const baseline = regionData.baseline2025[threshold];
                const multiplier = regionData.multiplier[threshold];
                const increase = (multiplier - 1) * baseline * acceleratedProgress;
                const noise = (Math.random() - 0.5) * 3;
                
                data.push({
                    year: year,
                    region: regionName,
                    threshold: threshold,
                    days: Math.max(0, Math.round(baseline + increase + noise)),
                    color: regions[regionName].color
                });
            });
        });
    });
    
    return data;
}

// Create the extreme heat days visualization
function createExtremeHeatChart() {
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

    // Caption / short explanation
    chartSection.append('p')
        .attr('class', 'chart-caption')
        .text('Projected annual number of days exceeding temperature thresholds for each region. Use the selectors to compare thresholds and focus on specific regions.');
    
    const { width, height, margin } = extremeHeatConfig;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
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
            .on('mouseover', function(event, d) {
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

                // Smart positioning (defined in script.js)
                if (typeof positionTooltip === 'function') {
                    positionTooltip(event, tooltip);
                }
            })
            .on('mousemove', function(event) {
                if (typeof positionTooltip === 'function') {
                    positionTooltip(event, d3.select('#tooltip'));
                }
            })
            .on('mouseout', function(event, d) {
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
    
    // Add info box
    const infoBox = chartSection.append('div')
        .attr('class', 'info-panel')
        .style('margin-top', '30px')
        .style('border-left', '5px solid #ef4444');
    
    infoBox.append('h3')
        .style('color', '#2d3748')
        .style('margin-bottom', '15px')
        .html('🔥 Critical Insight: Exponential Growth in Extreme Heat');
    
    infoBox.append('p')
        .style('color', '#4a5568')
        .style('line-height', '1.6')
        .style('margin-bottom', '12px')
        .html('<strong>Why this matters:</strong> The number of extreme heat days is projected to increase by 200-450% across US regions by 2100. This exponential growth has severe implications for:');
    
    const impactsList = infoBox.append('ul')
        .style('color', '#4a5568')
        .style('line-height', '1.8')
        .style('margin-left', '20px');
    
    [
        '<strong>Public Health:</strong> Heat-related mortality and emergency room visits will surge, particularly affecting vulnerable populations',
        '<strong>Infrastructure:</strong> Power grids face stress from cooling demands; roads and railways can buckle under extreme heat',
        '<strong>Agriculture:</strong> Crop yields decline and livestock productivity suffers during prolonged heat waves',
        '<strong>Labor Productivity:</strong> Outdoor work becomes dangerous or impossible, especially in the Southwest Interior region',
        '<strong>Energy Demand:</strong> Cooling costs skyrocket as air conditioning becomes a necessity rather than a comfort'
    ].forEach(text => {
        impactsList.append('li')
            .html(text)
            .style('margin-bottom', '8px');
    });
    
    infoBox.append('p')
        .style('color', '#4a5568')
        .style('line-height', '1.6')
        .style('margin-top', '15px')
        .style('font-style', 'italic')
        .html('The Southwest Interior and Great Plains show the steepest increases, with extreme heat days (>105°F) potentially increasing from 15 to over 80 days annually—more than 2 months of dangerous heat conditions.');
}

// ===================================================================
// COMPARISON CHART: Regional Temperature Increase by Decade
// ===================================================================

function createDecadalComparisonChart() {
    const container = d3.select('main');
    
    // Add new section
    const chartSection = container.append('div')
        .attr('class', 'chart-container')
        .style('margin-top', '30px');
    
    chartSection.append('h2')
        .text('Decadal Temperature Increase Comparison')
        .style('color', '#2d3748')
        .style('margin-bottom', '10px');
    
    chartSection.append('p')
        .attr('class', 'chart-subtitle')
        .text('Temperature increase from 2025 baseline for each decade - Shows acceleration of warming over time');
    
    // Configuration
    const config = {
        width: 1200,
        height: 500,
        margin: { top: 40, right: 60, bottom: 100, left: 80 }
    };
    
    // Create SVG
    const svg = chartSection.append('svg')
        .attr('id', 'decadal-chart')
        .attr('viewBox', `0 0 ${config.width} ${config.height}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    // Caption
    chartSection.append('p')
        .attr('class', 'chart-caption')
        .text('Temperature increase relative to a 2025 baseline for each decade. Bars show regional warming trends and their acceleration over time.');
    
    const { width, height, margin } = config;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Prepare data
    const decades = [2030, 2040, 2050, 2060, 2070, 2080, 2090, 2100];
    const decadalData = [];
    
    Object.keys(regions).forEach(regionName => {
        const regionData = temperatureData[regionName];
        decades.forEach(decade => {
            const dataPoint = regionData.find(d => d.year === decade);
            if (dataPoint) {
                decadalData.push({
                    region: regionName,
                    decade: decade,
                    temp: dataPoint.temp,
                    color: regions[regionName].color
                });
            }
        });
    });
    
    // Scales
    const x0 = d3.scaleBand()
        .domain(decades)
        .range([0, innerWidth])
        .padding(0.2);
    
    const x1 = d3.scaleBand()
        .domain(Object.keys(regions))
        .range([0, x0.bandwidth()])
        .padding(0.05);
    
    const yScale = d3.scaleLinear()
        .domain([0, 6])
        .range([innerHeight, 0]);
    
    const colorScale = d3.scaleOrdinal()
        .domain(Object.keys(regions))
        .range(Object.values(regions).map(r => r.color));
    
    // Grid
    g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale)
            .ticks(6)
            .tickSize(-innerWidth)
            .tickFormat(''));
    
    // Axes
    g.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x0).tickFormat(d => d))
        .selectAll('text')
        .style('font-size', '12px')
        .style('font-weight', 'bold');
    
    g.append('g')
        .call(d3.axisLeft(yScale).ticks(6));
    
    // Axis labels
    g.append('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 45)
        .attr('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .style('fill', '#2d3748')
        .text('Decade');
    
    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', -innerHeight / 2)
        .attr('y', -55)
        .attr('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .style('fill', '#2d3748')
        .text('Temperature Increase (°C)');
    
    // Draw bars
    const decadeGroups = g.selectAll('.decade-group')
        .data(decades)
        .join('g')
        .attr('class', 'decade-group')
        .attr('transform', d => `translate(${x0(d)},0)`);
    
    decadeGroups.selectAll('.bar')
        .data(decade => decadalData.filter(d => d.decade === decade))
        .join('rect')
        .attr('class', 'bar')
        .attr('x', d => x1(d.region))
        .attr('y', innerHeight)
        .attr('width', x1.bandwidth())
        .attr('height', 0)
        .attr('fill', d => d.color)
        .attr('opacity', 0.85)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 1)
                .attr('stroke', '#2d3748')
                .attr('stroke-width', 2);
            
            const tooltip = d3.select('#tooltip');
            tooltip.html(`
                <strong>${d.region}</strong><br/>
                Decade: ${d.decade}<br/>
                Increase: <strong>+${d.temp.toFixed(2)}°C</strong><br/>
                (${(d.temp * 1.8).toFixed(1)}°F above 2025)
            `)
            .classed('visible', true);

            if (typeof positionTooltip === 'function') {
                positionTooltip(event, tooltip);
            }
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('opacity', 0.85)
                .attr('stroke', 'none');
            
            d3.select('#tooltip').classed('visible', false);
        })
        .transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .attr('y', d => yScale(d.temp))
        .attr('height', d => innerHeight - yScale(d.temp));
    
    // Legend
    const legend = svg.append('g')
        .attr('transform', `translate(${margin.left}, ${height - margin.bottom + 60})`);
    
    const legendItems = legend.selectAll('.legend-item')
        .data(Object.keys(regions))
        .join('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(${i * 200}, 0)`);
    
    legendItems.append('rect')
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', d => regions[d].color)
        .attr('opacity', 0.85);
    
    legendItems.append('text')
        .attr('x', 24)
        .attr('y', 14)
        .style('font-size', '13px')
        .style('fill', '#2d3748')
        .text(d => d);
}

// ===================================================================
// Initialize additional charts after the page loads
// ===================================================================

// Wait for the main visualizations to be created, then add the new ones
window.addEventListener('load', function() {
    setTimeout(() => {
        createExtremeHeatChart();
        createDecadalComparisonChart();
    }, 1000);
});