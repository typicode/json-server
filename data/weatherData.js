export async function getWeatherData(location) {
    const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min,weathercode&forecast_days=10&timezone=auto`;

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        return {
            hourly: data.hourly.temperature_2m.slice(0, 24), // 24-hour forecast
            weekly: data.daily.temperature_2m_max.slice(0, 10), // 10-day forecast
            weatherCodes: data.hourly.weathercode.slice(0, 24) // Weather conditions
        };
    } catch (error) {
        console.error("Error fetching weather data:", error);
        return { hourly: [], weekly: [], weatherCodes: [] };
    }
}
