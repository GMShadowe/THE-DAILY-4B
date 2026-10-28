import requests

WEATHER_CODES = {
    0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow",
    80: "Rain showers", 81: "Rain showers", 82: "Violent showers",
    95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ hail",
}


def pick_place(results, country):
    wanted = (country or "").strip().lower()
    match = next((p for p in results if wanted and p.get("country", "").lower() == wanted), None)
    return match or (results[0] if results else None)


def _geocode(city, country):
    r = requests.get(
        "https://geocoding-api.open-meteo.com/v1/search",
        params={"name": city, "count": 10},
        timeout=15,
    )
    r.raise_for_status()
    place = pick_place(r.json().get("results") or [], country)
    return (place["latitude"], place["longitude"]) if place else None


def fetch(city, country):
    coords = _geocode(city, country)
    if not coords:
        return None
    lat, lon = coords

    r = requests.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,weather_code",
            "daily": "temperature_2m_max,temperature_2m_min",
            "timezone": "auto",
        },
        timeout=15,
    )
    r.raise_for_status()
    data = r.json()
    current = data.get("current", {})
    daily = data.get("daily", {})
    code = current.get("weather_code")

    return {
        "city": city,
        "country": country,
        "temperature": current.get("temperature_2m"),
        "code": code,
        "condition": WEATHER_CODES.get(code, "Unknown"),
        "high": (daily.get("temperature_2m_max") or [None])[0],
        "low": (daily.get("temperature_2m_min") or [None])[0],
    }
