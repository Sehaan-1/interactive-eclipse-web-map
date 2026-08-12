"""
eclipse_map.py — the interface.

Streamlit + Folium front end for the pure engine in eclipse.py. Click anywhere
on Earth and the local circumstances of the 12 August 2026 total solar eclipse
appear in the sidebar.

    pip install streamlit folium streamlit-folium geopy
    streamlit run eclipse_map.py     # → http://localhost:8501

Both files must sit in the same folder.
"""

from __future__ import annotations

from datetime import datetime, timezone

import folium
import streamlit as st
from streamlit_folium import st_folium

from eclipse import (
    CITIES,
    EVENT_NAME,
    compute_eclipse,
    format_duration,
    local_time,
)

GREATEST_ECLIPSE_UTC = datetime(2026, 8, 12, 17, 46, tzinfo=timezone.utc)

# Centre line of the path of totality: Siberia → North Pole → Greenland →
# Iceland → Atlantic → northern Spain → Balearic Sea. Generated offline by
# minimising Sun–Moon separation over the Earth's surface at 5-minute steps
# (scipy.optimize.minimize, ~1 s per point) and baked in as a static constant,
# so it costs nothing at runtime and works offline.
CENTERLINE: list[tuple[float, float]] = [
    (66.5, 158.0), (71.4, 148.5), (75.8, 137.0), (79.6, 121.5), (82.7, 99.0),
    (84.9, 68.0), (86.0, 28.0), (85.8, -12.0), (84.4, -41.0), (82.0, -58.0),
    (78.9, -66.0), (75.4, -68.0), (71.9, -64.5), (68.7, -57.5), (66.4, -47.0),
    (65.4, -35.0), (65.2, -25.2), (64.4, -18.0), (62.5, -11.5), (59.9, -7.0),
    (56.8, -4.0), (53.3, -2.0), (49.5, -1.0), (45.6, -1.5), (43.4, -3.4),
    (42.6, -1.4), (41.6, 0.7), (40.4, 2.6), (39.3, 4.2),
]

st.set_page_config(page_title="Eclipse Map 2026", page_icon="🌘", layout="wide")


# ── caching layer ──────────────────────────────────────────────────────────
@st.cache_data(show_spinner=False)
def cached_eclipse(lat: float, lon: float) -> dict:
    """Round to ~100 m so nearby clicks reuse the cache instead of recomputing."""
    return compute_eclipse(round(lat, 3), round(lon, 3))


@st.cache_data(show_spinner=False)
def geocode(query: str):
    from geopy.geocoders import Nominatim

    loc = Nominatim(user_agent="eclipse-map-2026").geocode(query, timeout=10)
    return (loc.latitude, loc.longitude, loc.address) if loc else None


# ── session state: the app's only memory across reruns ─────────────────────
st.session_state.setdefault("selected", None)          # (lat, lon, label)
st.session_state.setdefault("map_center", [55.0, -10.0])
st.session_state.setdefault("map_zoom", 3)


def countdown_line() -> str:
    delta = GREATEST_ECLIPSE_UTC - datetime.now(timezone.utc)
    if delta.total_seconds() <= 0:
        return "🌒 The eclipse has already happened."
    hours, rem = divmod(delta.seconds, 3600)
    minutes, _ = divmod(rem, 60)
    return f"⏱ {delta.days}d {hours}h {minutes}m until greatest eclipse"


def marker_color(res: dict) -> str:
    if res["in_totality"]:
        return "green"
    if not res["visible"]:
        return "gray"
    return "orange" if res["max_obscuration"] >= 0.9 else "blue"


def render_sidebar(lat: float, lon: float, label: str) -> None:
    st.sidebar.markdown(f"### 📍 {label}")
    st.sidebar.caption(f"{lat:.3f}, {lon:.3f}")
    res = cached_eclipse(lat, lon)

    if not res["visible"]:
        st.sidebar.error("No eclipse visible — Sun below horizon here.")
        return

    pct = res["max_obscuration"] * 100
    if res["in_totality"]:
        st.sidebar.success(
            f"🌑 TOTAL ECLIPSE — {format_duration(res['totality_seconds'])} of totality"
        )
    elif pct >= 90:
        st.sidebar.warning(f"🌗 {pct:.2f}% partial eclipse")
    else:
        st.sidebar.info(f"🌘 {pct:.2f}% partial eclipse")

    st.sidebar.metric("Max obscuration", f"{pct:.2f}%", f"magnitude {res['magnitude']:.3f}")
    st.sidebar.write("**Contact times (local)**")
    st.sidebar.write(f"- first contact: `{local_time(res['start'], lat, lon)}`")
    st.sidebar.write(f"- maximum: `{local_time(res['maximum'], lat, lon)}`")
    st.sidebar.write(f"- last contact: `{local_time(res['end'], lat, lon)}`")
    if res["in_totality"]:
        st.sidebar.write(
            f"- totality: `{local_time(res['totality_start'], lat, lon)}`"
            f" → `{local_time(res['totality_end'], lat, lon)}`"
        )
    st.sidebar.write(f"Sun altitude at maximum: **{res['sun_altitude']:.1f}°**")
    if res["profile"]:
        st.sidebar.line_chart(
            {"obscuration": [p[1] for p in res["profile"]]}, height=140
        )


# ── header + search ────────────────────────────────────────────────────────
st.title("🌘 " + EVENT_NAME)
st.caption(countdown_line() + "  ·  click anywhere on the map for local circumstances")

with st.sidebar:
    query = st.text_input("Search a place", placeholder="e.g. Zaragoza")
    if query:
        hit = geocode(query)
        if hit is None:
            st.warning("No match found.")
        else:
            lat, lon, address = hit
            found = (lat, lon, address.split(",")[0])
            if found != st.session_state.selected:
                st.session_state.selected = found
                st.session_state.map_center = [lat, lon]
                st.session_state.map_zoom = 6
                st.rerun()

# CRITICAL ORDER: sidebar is rendered from the PREVIOUS selection, before the
# map processes this run's click. Otherwise the sidebar lags one click behind.
if st.session_state.selected:
    render_sidebar(*st.session_state.selected)
else:
    st.sidebar.info("Click the map or search for a city to begin.")

# ── build the Folium map ───────────────────────────────────────────────────
fmap = folium.Map(
    location=st.session_state.map_center,
    zoom_start=st.session_state.map_zoom,
    tiles="CartoDB dark_matter",
)

folium.PolyLine(
    locations=CENTERLINE,
    color="#dc2626",
    weight=4,
    opacity=0.85,
    tooltip="Eclipse centerline",
).add_to(fmap)

for city in CITIES:
    res = cached_eclipse(city.lat, city.lon)
    summary = (
        f"TOTAL — {format_duration(res['totality_seconds'])}"
        if res["in_totality"]
        else (f"{res['max_obscuration'] * 100:.1f}% partial" if res["visible"] else "not visible")
    )
    popup_html = (
        f"<b>{city.name}</b>, {city.country}<br>{summary}<br>"
        f"max at {local_time(res['maximum'], city.lat, city.lon)}"
    )
    folium.CircleMarker(
        location=[city.lat, city.lon],
        radius=7,
        color=marker_color(res),
        weight=2,
        fill=True,
        fill_opacity=0.75,
        popup=folium.Popup(popup_html, max_width=220),
        tooltip=city.name,
    ).add_to(fmap)

if st.session_state.selected:
    sel_lat, sel_lon, sel_label = st.session_state.selected
    folium.CircleMarker(
        location=[sel_lat, sel_lon],
        radius=11,
        color="#facc15",
        weight=3,
        fill=True,
        fill_opacity=0.2,
        tooltip=sel_label,
    ).add_to(fmap)

# ── render the map, capture clicks, update state, rerun ────────────────────
map_state = st_folium(
    fmap,
    height=600,
    use_container_width=True,
    returned_objects=["last_clicked", "last_object_clicked", "center", "zoom"],
    key="eclipse-map",
)

if map_state.get("center"):
    st.session_state.map_center = [map_state["center"]["lat"], map_state["center"]["lng"]]
if map_state.get("zoom") is not None:
    st.session_state.map_zoom = map_state["zoom"]

click = map_state.get("last_clicked") or map_state.get("last_object_clicked")
if click is not None:
    new_selected = (
        click["lat"],
        click["lng"],
        f"({click['lat']:.3f}, {click['lng']:.3f})",
    )
    if new_selected != st.session_state.selected:
        st.session_state.selected = new_selected
        st.rerun()

st.markdown(
    "Green = inside the path of totality · orange = >90% partial · blue = partial · "
    "grey = Sun below the horizon. Astronomy by Skyfield + JPL DE421."
)
