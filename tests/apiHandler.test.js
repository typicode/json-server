import { getWeatherData } from '../data/weatherData.js';

test('getWeatherData should return an array', async () => {
    const data = await getWeatherData();
    expect(Array.isArray(data)).toBe(true);
});
