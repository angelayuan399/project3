import { regions, temperatureData } from "../main.js";

export function createDecadalComparisonChart() {
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