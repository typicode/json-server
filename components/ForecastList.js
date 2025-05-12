// UPDATED: Passes weather condition to WeatherCard
import { WeatherCard } from './WeatherCard.js';

export const ForecastList = (weatherData) => {
    return `
        <div class="forecast-container">
            <h2>Weekly Forecast</h2>
            <div class="forecast-list">
                ${weatherData.map((temp, index) => WeatherCard(index + 1, temp, "sunny")).join('')}
            </div>
        </div>
    `;
}
