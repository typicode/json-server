export const attachEventListeners = () => {
    document.querySelector('.forecast-container').addEventListener('click', () => {
        alert("Weather data updated!");
    });
}
