import { WeatherCard } from './WeatherCard.js';

export function HourlyForecast(hourlyData, weatherCodes) {
    return `
        <div class="forecast-container">
            <h2>24-Hour Forecast</h2>
            <div class="forecast-list">
                ${hourlyData.map((temp, index) => WeatherCard(index, temp, getWeatherCondition(weatherCodes[index]))).join('')}
            </div>
        </div>
    `;
}

function getWeatherCondition(code) {
    if (code === 1) return "sunny";
    if (code === 2) return "cloudy";
    if (code === 3) return "rainy";
    if (code === 4) return "snowy";
    return "cloudy"; // Default
}
