import { createExtremeHeatChart } from "./js/chart-extreme-heat.js";
import { createDecadalComparisonChart } from "./js/chart-decal-comparison.js";
import { createTimeSeriesChart } from "./js/chart-time-series.js";
import { createRegionalHeatmap } from './js/chart-regional-heatmap.js';
import { createScenarioComparison } from './js/chart-scenario-comparison.js';
import { createAnomalyChart } from './js/chart-anomaly-multiple.js';
import { createLegend } from "./js/helper.js";

// Configuration for extreme heat days chart
export const extremeHeatConfig = {
    width: 1200,
    height: 500,
    margin: { top: 40, right: 140, bottom: 60, left: 80 }
};

export const config = {
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

export const regions = {
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

// ===================================================================
// REPLACE - GENERATES SAMPLE DATA, NOT CMIP6 DATA
// ===================================================================
export function generateExtremeHeatData() {
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
export const temperatureData = {
    'Southwest Interior': generateTemperatureData('Southwest Interior', 5.5, 1.2),
    'Great Plains': generateTemperatureData('Great Plains', 5.0, 1.1),
    'Pacific Northwest': generateTemperatureData('Pacific Northwest', 4.0, 1.0),
    'Southeast Coast': generateTemperatureData('Southeast Coast', 3.5, 0.9),
    'Northeast Coast': generateTemperatureData('Northeast Coast', 3.8, 0.95)
};

// Get temperature for a region at a specific year
export function getTemperature(regionName, year) {
    const data = temperatureData[regionName];
    const point = data.find(d => d.year === year);
    return point ? point.temp : 0;
}

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

export const mapData = generateMapData();
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    d3.csv("data/us_regional_july_temps.csv", d3.autoType).then(data => {

        // Filter data for the high-emissions scenario
        const ssp585_data = data.filter(d => d.scenario === 'ssp585');
        const dumbbell_data = data.filter(d =>
            d.year === 2100 &&
            (d.scenario === 'ssp245' || d.scenario === 'ssp585')
        );

        // --- CALL CHARTS ---

        createRegionalHeatmap(ssp585_data);
        createScenarioComparison(dumbbell_data);
        createAnomalyChart(data);
        createTimeSeriesChart();
        createExtremeHeatChart();
        createDecadalComparisonChart();

        createLegend();
        
    }).catch(error => {
        console.error("Error loading the CSV file:", error);
    });
});