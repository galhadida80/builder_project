import base64
import io
from typing import Any

import matplotlib
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm

matplotlib.use("Agg")


COLORS = {
    "primary": "#1976d2",
    "secondary": "#dc004e",
    "success": "#4caf50",
    "warning": "#ff9800",
    "error": "#f44336",
    "info": "#2196f3",
    "completed": "#4caf50",
    "pending": "#ff9800",
    "overdue": "#f44336",
    "approved": "#4caf50",
    "rejected": "#f44336",
    "in_review": "#ff9800",
    "open": "#2196f3",
    "closed": "#757575",
}


def _get_font_path() -> str | None:
    """Get path to a font that supports Hebrew characters."""
    try:
        fonts = fm.findSystemFonts(fontpaths=None, fontext="ttf")
        for font_path in fonts:
            font_name = fm.FontProperties(fname=font_path).get_name().lower()
            if any(name in font_name for name in ["arial", "dejavu", "liberation"]):
                return font_path
    except Exception:
        pass
    return None


def _setup_rtl_support():
    """Configure matplotlib for RTL (Hebrew) text support."""
    font_path = _get_font_path()
    if font_path:
        plt.rcParams["font.family"] = fm.FontProperties(fname=font_path).get_name()
    plt.rcParams["axes.unicode_minus"] = False


def _fig_to_base64(fig: plt.Figure) -> str:
    """Convert matplotlib figure to base64-encoded PNG string."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=150)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode("utf-8")
    buf.close()
    plt.close(fig)
    return img_base64


def generate_progress_chart(data: dict[str, int | float]) -> str:
    """
    Generate a progress pie chart showing completed vs pending items.

    Args:
        data: Dictionary with 'completed' and 'pending' keys

    Returns:
        Base64-encoded PNG image string
    """
    _setup_rtl_support()

    completed = data.get("completed", 0)
    pending = data.get("pending", 0)

    if completed == 0 and pending == 0:
        completed = 1

    fig, ax = plt.subplots(figsize=(8, 6))

    sizes = [completed, pending]
    labels = ["Completed", "Pending"]
    colors = [COLORS["completed"], COLORS["pending"]]

    wedges, texts, autotexts = ax.pie(
        sizes,
        labels=labels,
        colors=colors,
        autopct="%1.1f%%",
        startangle=90,
        textprops={"fontsize": 12, "weight": "bold"},
    )

    for autotext in autotexts:
        autotext.set_color("white")

    ax.axis("equal")
    plt.title("Progress Overview", fontsize=16, weight="bold", pad=20)

    return _fig_to_base64(fig)


def generate_inspection_chart(data: dict[str, Any]) -> str:
    """
    Generate inspection statistics bar chart.

    Args:
        data: Dictionary with inspection status counts

    Returns:
        Base64-encoded PNG image string
    """
    _setup_rtl_support()

    fig, ax = plt.subplots(figsize=(10, 6))

    statuses = list(data.keys())
    counts = list(data.values())
    colors_list = [COLORS.get(status.lower(), COLORS["primary"]) for status in statuses]

    bars = ax.bar(statuses, counts, color=colors_list, edgecolor="black", linewidth=1.2)

    for bar in bars:
        height = bar.get_height()
        ax.text(
            bar.get_x() + bar.get_width() / 2.0,
            height,
            f"{int(height)}",
            ha="center",
            va="bottom",
            fontsize=11,
            weight="bold",
        )

    ax.set_ylabel("Count", fontsize=12, weight="bold")
    ax.set_xlabel("Status", fontsize=12, weight="bold")
    ax.set_title("Inspection Statistics", fontsize=16, weight="bold", pad=20)
    ax.grid(axis="y", alpha=0.3, linestyle="--")
    ax.set_axisbelow(True)

    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()

    return _fig_to_base64(fig)


def generate_approval_trend_chart(data: list[dict[str, Any]]) -> str:
    """
    Generate approval trend line chart over time.

    Args:
        data: List of dicts with 'date' and status counts

    Returns:
        Base64-encoded PNG image string
    """
    _setup_rtl_support()

    if not data:
        return generate_empty_chart("No approval data available")

    fig, ax = plt.subplots(figsize=(12, 6))

    dates = [item["date"] for item in data]
    approved = [item.get("approved", 0) for item in data]
    rejected = [item.get("rejected", 0) for item in data]
    in_review = [item.get("in_review", 0) for item in data]

    ax.plot(dates, approved, marker="o", color=COLORS["approved"], linewidth=2, label="Approved")
    ax.plot(dates, rejected, marker="s", color=COLORS["rejected"], linewidth=2, label="Rejected")
    ax.plot(dates, in_review, marker="^", color=COLORS["in_review"], linewidth=2, label="In Review")

    ax.set_ylabel("Count", fontsize=12, weight="bold")
    ax.set_xlabel("Date", fontsize=12, weight="bold")
    ax.set_title("Approval Trends Over Time", fontsize=16, weight="bold", pad=20)
    ax.legend(loc="upper left", frameon=True, shadow=True)
    ax.grid(True, alpha=0.3, linestyle="--")
    ax.set_axisbelow(True)

    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()

    return _fig_to_base64(fig)


def generate_rfi_aging_chart(data: dict[str, int]) -> str:
    """
    Generate RFI aging horizontal bar chart.

    Args:
        data: Dictionary with age ranges as keys and counts as values
              e.g., {"0-7 days": 5, "8-14 days": 3, "15-30 days": 2, "30+ days": 1}

    Returns:
        Base64-encoded PNG image string
    """
    _setup_rtl_support()

    fig, ax = plt.subplots(figsize=(10, 6))

    age_ranges = list(data.keys())
    counts = list(data.values())

    color_map = {
        "0-7": COLORS["success"],
        "8-14": COLORS["info"],
        "15-30": COLORS["warning"],
        "30+": COLORS["error"],
    }

    colors_list = []
    for age_range in age_ranges:
        for key, color in color_map.items():
            if age_range.startswith(key):
                colors_list.append(color)
                break
        else:
            colors_list.append(COLORS["primary"])

    bars = ax.barh(age_ranges, counts, color=colors_list, edgecolor="black", linewidth=1.2)

    for bar in bars:
        width = bar.get_width()
        ax.text(
            width,
            bar.get_y() + bar.get_height() / 2.0,
            f" {int(width)}",
            ha="left",
            va="center",
            fontsize=11,
            weight="bold",
        )

    ax.set_xlabel("Count", fontsize=12, weight="bold")
    ax.set_ylabel("Age Range", fontsize=12, weight="bold")
    ax.set_title("RFI Aging Distribution", fontsize=16, weight="bold", pad=20)
    ax.grid(axis="x", alpha=0.3, linestyle="--")
    ax.set_axisbelow(True)

    plt.tight_layout()

    return _fig_to_base64(fig)


def generate_empty_chart(message: str = "No data available") -> str:
    """
    Generate an empty chart with a message.

    Args:
        message: Message to display on the chart

    Returns:
        Base64-encoded PNG image string
    """
    _setup_rtl_support()

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.text(
        0.5,
        0.5,
        message,
        ha="center",
        va="center",
        fontsize=14,
        weight="bold",
        color=COLORS["info"],
    )
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")

    return _fig_to_base64(fig)


def generate_status_distribution_chart(data: dict[str, int], title: str = "Status Distribution") -> str:
    """
    Generate a generic status distribution pie chart.

    Args:
        data: Dictionary with status labels as keys and counts as values
        title: Chart title

    Returns:
        Base64-encoded PNG image string
    """
    _setup_rtl_support()

    if not data or sum(data.values()) == 0:
        return generate_empty_chart("No status data available")

    fig, ax = plt.subplots(figsize=(8, 6))

    labels = list(data.keys())
    sizes = list(data.values())
    colors_list = [COLORS.get(label.lower(), COLORS["primary"]) for label in labels]

    wedges, texts, autotexts = ax.pie(
        sizes,
        labels=labels,
        colors=colors_list,
        autopct="%1.1f%%",
        startangle=90,
        textprops={"fontsize": 11, "weight": "bold"},
    )

    for autotext in autotexts:
        autotext.set_color("white")

    ax.axis("equal")
    plt.title(title, fontsize=16, weight="bold", pad=20)

    return _fig_to_base64(fig)
