import { getWeatherData } from '../data/weatherData.js';
import { HourlyForecast } from '../components/HourlyForecast.js';
import { WeeklyForecast } from '../components/WeeklyForecast.js';

export function loadApp() {
    const searchInput = document.getElementById('search');
    const searchButton = document.getElementById('search-btn');

    // Load default weather for Lier, Belgium
    fetchWeather("Lier, Belgium");

    // Search on button click
    searchButton.addEventListener('click', () => fetchWeather(searchInput.value));

    // Search on Enter key press
    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            fetchWeather(searchInput.value);
        }
    });

    // Real-time updates every 10 minutes
    setInterval(() => fetchWeather("Lier, Belgium"), 600000);
}

async function fetchWeather(query) {
    const location = await getLocation(query);

    if (!location) {
        displayError(`Location "${query}" not found. Please check the spelling.`);
        return;
    }

    const weatherData = await getWeatherData(location);
    document.getElementById('hourly-forecast').innerHTML = HourlyForecast(weatherData.hourly, weatherData.weatherCodes);
    document.getElementById('weekly-forecast').innerHTML = WeeklyForecast(weatherData.weekly);
}

async function getLocation(query) {
    const geoAPI = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;
    const response = await fetch(geoAPI);
    const data = await response.json();

    if (data.length === 0) {
        return null; // Return null if location is not found
    }

    return { lat: data[0].lat, lon: data[0].lon };
}

function displayError(message) {
    const forecastContainer = document.getElementById('hourly-forecast');
    forecastContainer.innerHTML = `<p class="error">${message}</p>`;
}
