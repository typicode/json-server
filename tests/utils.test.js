import { formatTemperature } from '../scripts/utils.js';

test('formatTemperature should format temperature correctly', () => {
    expect(formatTemperature(25)).toBe('25.0°C');
    expect(formatTemperature(30.567)).toBe('30.6°C');
    expect(formatTemperature(-5)).toBe('-5.0°C');
});
