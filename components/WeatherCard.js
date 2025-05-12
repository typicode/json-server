export const WeatherCard = (hourIndex, temperature, condition) => {
    const icon = getWeatherIcon(condition);
    return `
        <div class="weather-card">
            <h3>${formatHour(hourIndex)}</h3>
            <img src="assets/${icon}" alt="${condition}" />
            <p>${temperature !== undefined ? temperature.toFixed(1) : "N/A"}°C</p>
        </div>
    `;
};

// Function to format hours correctly (00:00 to 23:00)
const formatHour = (hourIndex) => {
    return `${hourIndex.toString().padStart(2, '0')}:00`;
};

// Function to get weather icons based on conditions
const getWeatherIcon = (condition) => {
    if (condition.includes("sunny")) return "../public/sunny.png";
if (condition.includes("cloudy")) return "../public/cloudy.png";
if (condition.includes("rain")) return "../public/rainy.jpg";
if (condition.includes("snow")) return "../public/snow.webp";
return "cloudy.png"; // Default icon
};




/*if (condition.includes("sunny")) return "../public/sunny.png";
if (condition.includes("cloudy")) return "../public/cloudy.png";
if (condition.includes("rain")) return "../public/rainy.jpg";
if (condition.includes("snow")) return "../public/snow.webp";
return "cloudy.png"; // Default icon
};*/
