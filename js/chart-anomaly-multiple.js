import { positionTooltip, hideTooltip } from './helper.js';

export function createAnomalyChart(data) {

    // --- 1. Data Pre-processing: Calculate Anomaly ---

    // a. Calculate the historical baseline (1850-1900) for each region
    const historicalData = data.filter(d => d.scenario === 'historical' && d.year >= 1850 && d.year <= 1900);
    const baselineTemps = new Map();

    d3.group(historicalData, d => d.region).forEach((values, key) => {
        const baseline = d3.mean(values, v => v.july_temp_c);
        baselineTemps.set(key, baseline);
    });

    // b. Calculate the anomaly (difference from baseline) for all data points
    const anomalyData = data.map(d => {
        const baseline = baselineTemps.get(d.region);
        return {
            ...d,
            anomaly: d.july_temp_c - baseline
        };
    });

    // c. Filter data for the plot (2025-2100) as per the research question
    const plotData = anomalyData.filter(d => d.year >= 2025);

    // --- 2. Setup Dimensions for Small Multiples ---
    // We will create a 2x2 grid of charts

    const totalWidth = 1200; // Full width of the SVG container
    const totalHeight = 800; // Full height (2 charts tall)

    // Margins for *each* small chart
    const margin = { top: 60, right: 30, bottom: 40, left: 60 };

    // Width and height of *each* small chart
    const smallWidth = (totalWidth / 2) - margin.left - margin.right;
    const smallHeight = (totalHeight / 2) - margin.top - margin.bottom;

    const svg = d3.select("#anomaly-charts")
        .attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`)
        .append("g");

    const tooltip = d3.select("#tooltip");

    // --- 3. Global Scales (Shared by all charts) ---

    // X-Scale: Year (linear)
    const xScale = d3.scaleLinear()
        .domain([2025, 2100])
        .range([0, smallWidth]);

    // Y-Scale: Anomaly (linear)
    // We use the global extent so all charts are on the same, comparable Y-axis
    const [minAnomaly, maxAnomaly] = d3.extent(plotData, d => d.anomaly);
    const yScale = d3.scaleLinear()
        .domain([minAnomaly, maxAnomaly])
        .range([smallHeight, 0])
        .nice(); // Round the domain to nice numbers

    // Color Scale: Scenarios
    const colorScale = d3.scaleOrdinal()
        .domain(['ssp245', 'ssp585'])
        .range(['#4e79a7', '#e15759']); // Blue, Red (from your other chart)

    // Line Generator
    const lineGen = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.anomaly));

    // --- 4. Add a Legend (at the top) ---
    const legend = svg.append("g")
        .attr("transform", `translate(6, 2)`); // Top-right

    legend.selectAll(".legend-item")
        .data(['ssp245', 'ssp585'])
        .join("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`)
        .call(g => {
            g.append("circle")
                .attr("cx", 0)
                .attr("cy", 5)
                .attr("r", 6)
                .attr("fill", d => colorScale(d));
            g.append("text")
                .attr("x", 15)
                .attr("y", 10)
                .text(d => d === 'ssp245' ? 'Medium Emission (ssp245)' : 'High Emission (ssp585)')
                .style("font-size", "14px")
                .style("font-family", "sans-serif");
        });


    // --- 5. Group Data and Create the Grid ---

    const dataByRegion = d3.group(plotData, d => d.region);
    const columns = 2;

    // Create a group for each region
    const chartGroups = svg.selectAll(".small-chart")
        .data(dataByRegion)
        .join("g")
        .attr("class", "small-chart")
        .attr("transform", (d, i) => {
            const col = i % columns;
            const row = Math.floor(i / columns);
            // Calculate position for each chart in the 2x2 grid
            const x = col * (smallWidth + margin.left + margin.right) + margin.left;
            const y = row * (smallHeight + margin.top + margin.bottom) + margin.top;
            return `translate(${x}, ${y})`;
        });

    // --- 6. Draw Content in Each Small Chart ---
    chartGroups.each(function (groupData) {
        const [regionName, regionData] = groupData;
        const chartG = d3.select(this); // The <g> for this specific chart

        // Store region name as data attribute for hover targeting
        chartG.attr("data-region", regionName);

        // Add Chart Title (Region Name)
        chartG.append("text")
            .attr("x", smallWidth / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .style("font-family", "sans-serif")
            .text(regionName);

        // Add X-Axis
        chartG.append("g")
            .attr("transform", `translate(0, ${smallHeight})`)
            .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format("d"))); // 'd' for integer years

        // Add Y-Axis
        chartG.append("g")
            .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d.toFixed(1)}°C`));

        // Add Y-Axis Label
        chartG.append("text")
            .attr("x", -smallHeight / 2)
            .attr("y", -margin.left + 15)
            .attr("transform", "rotate(-90)")
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-family", "sans-serif")
            .text("Temp. Increase (°C)");

        // Add a "zero" line (the historical baseline)
        chartG.append("line")
            .attr("x1", 0)
            .attr("x2", smallWidth)
            .attr("y1", yScale(0))
            .attr("y2", yScale(0))
            .attr("stroke", "#333")
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "2 2");

        // Group data by scenario to draw two lines
        const dataByScenario = d3.group(regionData, d => d.scenario);

        // Draw the lines
        chartG.selectAll(".line-path")
            .data(dataByScenario)
            .join("path")
            .attr("class", "line-path")
            .attr("d", d => lineGen(d[1])) // d[1] is the array of data points
            .attr("stroke", d => colorScale(d[0])) // d[0] is the scenario name
            .attr("fill", "none")
            .attr("stroke-width", 2.5)
            .style("opacity", 0.9);

        // ========================================
        // Draw circles for tooltips FIRST (so they're on top)
        // ========================================
        chartG.selectAll(".data-circle")
            .data(regionData) // Use all points for this region
            .join("circle")
            .attr("class", "data-circle")
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => yScale(d.anomaly))
            .attr("r", 4)
            .attr("fill", d => colorScale(d.scenario))
            .style("opacity", 0) // Hide them initially
            .style("pointer-events", "all") // Allow interaction with circles
            .style("cursor", "pointer")
            .on("mouseover", function (event, d) {
                // Show tooltip
                tooltip.classed("visible", true)
                    .html(`
                        <strong>${d.region} (${d.scenario})</strong><br/>
                        Year: ${d.year}<br/>
                        Increase: <strong>${d.anomaly.toFixed(2)}°C</strong>
                    `);

                // Enlarge this circle
                d3.select(this)
                    .attr("r", 6)
                    .style("stroke", "#000")
                    .style("stroke-width", 2);
                
                positionTooltip(event, tooltip);
            })
            .on("mousemove", function (event) {
                positionTooltip(event, tooltip);
            })
            .on("mouseout", function () {
                hideTooltip();
                
                // Return circle to normal size
                d3.select(this)
                    .attr("r", 4)
                    .style("stroke", "none");
            });

        // ========================================
        // Add invisible overlay for REGIONAL hover (fade effect)
        // This goes BEHIND the circles so circles can still be clicked
        // ========================================
        chartG.insert("rect", ":first-child") // Insert at beginning so it's behind everything
            .attr("class", "hover-overlay")
            .attr("width", smallWidth)
            .attr("height", smallHeight)
            .attr("fill", "none")
            .attr("pointer-events", "all")
            .style("cursor", "default")
            .on("mouseenter", function() {
                // Fade out all OTHER charts
                svg.selectAll(".small-chart")
                    .filter(d => d[0] !== regionName) // Filter out current region
                    .transition()
                    .duration(200)
                    .style("opacity", 0.25);
                
                // Ensure this chart stays at full opacity
                d3.select(chartG.node())
                    .transition()
                    .duration(200)
                    .style("opacity", 1);
                
                // Show ALL circles for this chart
                chartG.selectAll(".data-circle")
                    .transition()
                    .duration(200)
                    .style("opacity", 0.7);
            })
            .on("mouseleave", function() {
                // Only restore if mouse is truly leaving the chart area
                // Check if we're not hovering over a circle
                const relatedTarget = event.relatedTarget;
                if (!relatedTarget || !relatedTarget.classList.contains('data-circle')) {
                    // Restore all charts to full opacity
                    svg.selectAll(".small-chart")
                        .transition()
                        .duration(200)
                        .style("opacity", 1);
                    
                    // Hide circles again (unless actively hovering one)
                    chartG.selectAll(".data-circle")
                        .filter(function() {
                            return d3.select(this).attr("r") != "6"; // Don't hide actively hovered circle
                        })
                        .transition()
                        .duration(200)
                        .style("opacity", 0);
                }
            });
    });

    // ========================================
    // Add instructional text
    // ========================================
    svg.append("text")
        .attr("x", totalWidth / 2)
        .attr("y", totalHeight - 5)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-style", "italic")
        .style("fill", "#666")
        .text("💡 Hover over regions to compare • Hover over data points for exact values");
}
