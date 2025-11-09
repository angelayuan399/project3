// We now import the tooltip helpers from your helper.js file
import { positionTooltip, hideTooltip } from './helper.js';

export function createRegionalHeatmap(data) {

    // --- 1. Setup ---
    const margin = { top: 70, right: 50, bottom: 60, left: 100 };
    const width = 1200 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#regional-heatmap")
        .attr("viewBox", `0 0 1200 400`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- 2. Get domains from REAL data ---
    const years = [...new Set(data.map(d => d.year))].sort();
    const regions = [...new Set(data.map(d => d.region))];

    // --- 3. Scales ---
    const xScale = d3.scaleBand()
        .domain(years)
        .range([0, width])
        .padding(0.01);

    const yScale = d3.scaleBand()
        .domain(regions)
        .range([0, height])
        .padding(0.1);

    // Dynamic color scale
    const [minTemp, maxTemp] = d3.extent(data, d => d.july_temp_c);
    const colorScale = d3.scaleSequential(d3.interpolateInferno)
        .domain([minTemp, maxTemp]);

    // --- 4. Axes ---
    const xTickValues = years.filter(y => y % 10 === 0 || y === 2025);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickValues(xTickValues).tickSize(5))
        .selectAll("text")
        .style("font-size", "12px");

    svg.append("g")
        .call(d3.axisLeft(yScale))
        .selectAll("text")
        .style("font-size", "12px");

    // --- 5. NEW: Add the Gradient Legend ---
    const legendWidth = 300;
    const legendHeight = 20;
    const legendX = width - legendWidth; // Position top-right
    const legendY = -margin.top + 30;    // Position above the chart

    const legendGroup = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    // Create the gradient definition
    const defs = svg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "heatmap-gradient");

    // Add color stops to the gradient
    // We use d3.range to create 11 stops (0%, 10%, 20%... 100%)
    linearGradient.selectAll("stop")
        .data(d3.range(0, 1.1, 0.1)) // 0, 0.1, 0.2, ... 1.0
        .join("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => d3.interpolateInferno(d)); // d is 0-1

    // Draw the legend bar
    legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#heatmap-gradient)");

    // Draw the legend axis (scale)
    const legendScale = d3.scaleLinear()
        .domain([minTemp, maxTemp]) // Use the real temp values
        .range([0, legendWidth]);

    legendGroup.append("g")
        .attr("transform", `translate(0, ${legendHeight})`) // Below the bar
        .call(d3.axisBottom(legendScale).ticks(5).tickFormat(d3.format(".1f")))
        .selectAll("text")
        .style("font-size", "10px");

    // Add legend title
    legendGroup.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .style("font-size", "12px")
        .style("font-family", "sans-serif")
        .style("fill", "#333")
        .text("July Avg. Temp (°C)");

    // --- 6. NEW: Draw the Heatmap with Interactivity ---
    const tooltip = d3.select("#tooltip"); // Get your existing tooltip div

    svg.selectAll()
        .data(data)
        .join("rect")
        .attr("x", d => xScale(d.year))
        .attr("y", d => yScale(d.region))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScale(d.july_temp_c))
        .style("stroke", "none")
        .style("opacity", 0.9)
        .on("mouseover", function (event, d) {
            // Show the tooltip
            tooltip.classed("visible", true)
                .html(`<strong>${d.region}</strong><br/>Year: ${d.year}<br/>Temp: ${d.july_temp_c.toFixed(1)}°C`);

            // Highlight the cell
            d3.select(this)
                .style("stroke", "#000")
                .style("stroke-width", 1.5)
                .style("opacity", 1);
        })
        .on("mousemove", function (event) {
            // Use your helper function to move the tooltip
            positionTooltip(event, tooltip);
        })
        .on("mouseout", function () {
            // Use your helper function to hide
            hideTooltip();

            // Un-highlight the cell
            d3.select(this)
                .style("stroke", "none")
                .style("opacity", 0.9);
        });
}