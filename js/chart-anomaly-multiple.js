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

    const container = d3.select("#anomaly-charts").node().parentNode;
    
    // Create writeup section
    const writeupSection = d3.select(container)
        .append("div")
        .attr("class", "writeup-section")
        .style("background", "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)")
        .style("border-radius", "12px")
        .style("padding", "40px 50px")
        .style("margin-top", "40px")
        .style("box-shadow", "0 4px 12px rgba(0,0,0,0.08)")
        .style("border-left", "5px solid #667eea");

    // Rationale section
    const rationaleDiv = writeupSection.append("div")
        .style("margin-bottom", "40px");

    rationaleDiv.append("h2")
        .style("color", "#2d3748")
        .style("font-size", "1.8em")
        .style("margin-bottom", "20px")
        .style("font-weight", "700")
        .style("font-family", "sans-serif")
        .html("📊 Rationale for Design Decisions");

    const rationaleParagraphs = [
        "This visualization compares projected July temperature increases across four U.S. regions—the <strong>Northeast, Southeast, Midwest, and West</strong>—under two greenhouse gas emission scenarios (SSP2-4.5 and SSP5-8.5) from the CMIP6 dataset. We used a <strong>small-multiples layout</strong> so that viewers can easily compare regional patterns side by side without the chart feeling cluttered. Keeping the same scales across each plot helps highlight how differently each region responds to the same emissions scenario.",
        
        "We chose <strong style='color: #4e79a7;'>blue for the medium-emission case</strong> and <strong style='color: #e15759;'>red for the high-emission case</strong> because those colors naturally suggest cooler and hotter outcomes. The goal was to make the contrast between the two scenarios instantly recognizable, even at a glance.",
        
        "The <strong>interactive tooltips</strong> were added to make the visualization more exploratory and engaging. When users hover over a data point, they can see the exact year and projected temperature increase. This interactivity helps readers spot trends that might be easy to miss in a static plot. By hovering over points, users can see the exact year and temperature increase, which helps them connect the general trend lines to specific moments in time. This makes it much easier to notice details like when temperature growth speeds up, slows down, or diverges between emission scenarios.",
        
        "If all the data points were shown on a static plot, the result would be significant <strong>overplotting</strong>, making it difficult to distinguish year-to-year variations or regional differences. The <strong>regional fade-out interaction</strong> addresses this by dimming non-selected regions when hovering over a specific chart. This guides the viewer's attention to one region at a time, enabling focused comparison between emission scenarios while maintaining spatial context of all four regions. This layered interaction design supports both overview exploration and detail-on-demand investigation."
    ];

    rationaleParagraphs.forEach(text => {
        rationaleDiv.append("p")
            .style("color", "#4a5568")
            .style("line-height", "1.8")
            .style("margin-bottom", "16px")
            .style("font-size", "1.05em")
            .style("font-family", "sans-serif")
            .html(text);
    });

    // Development Process section
    const devDiv = writeupSection.append("div");

    devDiv.append("h2")
        .style("color", "#2d3748")
        .style("font-size", "1.8em")
        .style("margin-bottom", "20px")
        .style("margin-top", "20px")
        .style("font-weight", "700")
        .style("font-family", "sans-serif")
        .html("⚙️ Development Process");

    const devParagraphs = [
        "Our team split the work based on each member's strengths. One person focused on <strong>data preprocessing in Python</strong> to clean and organize the CMIP6 regional temperature data. We worked together to create multiple exploratory graphs to better understand the data. One person handled the <strong>D3.js setup</strong>, including defining the axes, scales, and small-multiples layout for the four U.S. regions. The rest of the team worked on styling, color choices, and adding interactive features like tooltips that display the year and temperature increase when hovering over a data point.",
        
        "In total, we spent around <strong>25–30 hours</strong> on the project. The most time-consuming part was understanding the CMIP6 data structure and deciding which subset to visualize. We tried several layouts but found the small-multiples design to be the clearest for comparing regional differences. Once the visuals were complete, we refined the color palette and typography to keep the overall design consistent and easy to read on the web."
    ];

    devParagraphs.forEach(text => {
        devDiv.append("p")
            .style("color", "#4a5568")
            .style("line-height", "1.8")
            .style("margin-bottom", "16px")
            .style("font-size", "1.05em")
            .style("font-family", "sans-serif")
            .html(text);
    });

    // Add time breakdown box
    const timeBreakdown = devDiv.append("div")
        .style("background", "white")
        .style("border-radius", "8px")
        .style("padding", "20px 25px")
        .style("margin-top", "20px")
        .style("box-shadow", "0 2px 8px rgba(0,0,0,0.05)");

    timeBreakdown.append("h3")
        .style("color", "#2d3748")
        .style("font-size", "1.2em")
        .style("margin-bottom", "15px")
        .style("font-weight", "600")
        .style("font-family", "sans-serif")
        .text("⏱️ Time Investment Breakdown");

    const timeList = timeBreakdown.append("ul")
        .style("list-style", "none")
        .style("padding", "0")
        .style("margin", "0");

    const timeItems = [
        { task: "Data exploration & preprocessing", hours: "8 hours", percentage: "27%" },
        { task: "D3.js implementation & layout design", hours: "10 hours", percentage: "33%" },
        { task: "Interactive features & tooltips", hours: "5 hours", percentage: "17%" },
        { task: "Styling, colors & typography", hours: "4 hours", percentage: "13%" },
        { task: "Testing & refinement", hours: "3 hours", percentage: "10%" }
    ];

    timeItems.forEach(item => {
        const li = timeList.append("li")
            .style("padding", "10px 0")
            .style("border-bottom", "1px solid #e2e8f0")
            .style("display", "flex")
            .style("justify-content", "space-between")
            .style("align-items", "center")
            .style("font-family", "sans-serif");

        li.append("span")
            .style("color", "#4a5568")
            .style("font-size", "1em")
            .html(`<strong>${item.task}</strong>`);

        const timeInfo = li.append("span")
            .style("display", "flex")
            .style("gap", "15px")
            .style("align-items", "center");

        timeInfo.append("span")
            .style("color", "#667eea")
            .style("font-weight", "600")
            .text(item.hours);

        timeInfo.append("span")
            .style("color", "#718096")
            .style("font-size", "0.9em")
            .text(item.percentage);
    });

    // Remove last border
    timeList.selectAll("li:last-child")
        .style("border-bottom", "none");


    challengesBox.append("h3")
        .style("color", "#856404")
        .style("font-size", "1.2em")
        .style("margin-bottom", "12px")
        .style("font-weight", "600")
        .style("font-family", "sans-serif")
        .html("🔧 Key Challenges & Solutions");

    const challengesList = [
        "<strong>Challenge:</strong> CMIP6 data complexity with multiple models and scenarios. <strong>Solution:</strong> Focused on a single model ensemble and two representative scenarios for clarity.",
        "<strong>Challenge:</strong> Balancing information density with readability. <strong>Solution:</strong> Used small multiples with shared scales and interactive tooltips to show detail on demand.",
        "<strong>Challenge:</strong> Preventing overplotting with 75+ years of data per region. <strong>Solution:</strong> Implemented progressive disclosure—circles appear only on hover, reducing visual clutter."
    ];

    challengesList.forEach(challenge => {
        challengesBox.append("p")
            .style("color", "#856404")
            .style("line-height", "1.7")
            .style("margin-bottom", "10px")
            .style("font-size", "0.95em")
            .style("font-family", "sans-serif")
            .html(challenge);
    });
}

