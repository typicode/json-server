import { WeatherCard } from './WeatherCard.js';

export function WeeklyForecast(weeklyData) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Next Monday", "Next Tuesday", "Next Wednesday"];
    
    return `
        <div class="forecast-container">
            <h2>10-Day Forecast</h2>
            <div class="forecast-list">
                ${weeklyData.map((temp, index) => `
                    <div class="weather-card">
                        <h3>${days[index]}</h3>
                        <p>${temp !== undefined ? temp.toFixed(1) : "N/A"}°C</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}
