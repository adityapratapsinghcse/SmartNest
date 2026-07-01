// Central place for values that would otherwise be hardcoded and duplicated
// across pages. Update here once if your device IDs or thresholds change.

export const ESP32_DEVICE_ID = 1 // your ESP32 Main Board row in the devices table

// Mirrors SMARTNEST_CONFIG.TEMP_THRESHOLD in backend settings.py — the
// auto-fan trigger point, not just a display cutoff.
export const TEMP_THRESHOLD_C = 35.0

// Display-only status coloring thresholds (SensorCard, Safety page)
export const TEMP_WARNING_C = 32
export const TEMP_DANGER_C = 38
export const GAS_WARNING_PPM = 300
export const GAS_DANGER_PPM = 600