"""
TheKanBan pixel renderer — Pillow only, nearest-neighbor upscales.
Rerun: python scripts/render-pixel.py
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT_ICONS = ROOT / "src" / "assets" / "pixel" / "icons"
OUT_UI = ROOT / "src" / "assets" / "pixel" / "ui"
PUBLIC = ROOT / "public"

PALETTE = {
    ".": None,
    "C": (255, 248, 231, 255),  # cream
    "I": (45, 42, 38, 255),  # ink
    "R": (255, 107, 107, 255),  # coral
    "M": (78, 205, 196, 255),  # mint
    "Y": (255, 230, 109, 255),  # yellow
    "G": (149, 225, 211, 255),  # soft green
    "L": (199, 206, 234, 255),  # lilac
    "W": (255, 255, 255, 255),  # white
    "O": (232, 93, 4, 255),  # warm orange
}


def paint(rows: list[str]) -> Image.Image:
    h = len(rows)
    w = len(rows[0])
    for i, row in enumerate(rows):
        if len(row) != w:
            raise ValueError(f"row {i} width {len(row)} != {w}")
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch not in PALETTE:
                raise KeyError(f"unknown '{ch}' at {x},{y}")
            color = PALETTE[ch]
            if color is not None:
                px[x, y] = color
    return img


def save(img: Image.Image, path: Path, scale: int = 1) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    out = img if scale == 1 else img.resize((img.width * scale, img.height * scale), Image.NEAREST)
    out.save(path)
    print(f"wrote {path.relative_to(ROOT)} ({out.width}x{out.height})")


def grip_16() -> Image.Image:
    return paint(
        [
            "................",
            "................",
            "................",
            "................",
            "....I...I.......",
            "................",
            "....I...I.......",
            "................",
            "....I...I.......",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
        ]
    )


def column_accent_16() -> Image.Image:
    return paint(
        [
            "................",
            ".IIIIIIIIIIIIII.",
            ".IRRRMMMYYYWWWI.",
            ".IRRRMMMYYYWWWI.",
            ".IRRRMMMYYYWWWI.",
            ".IRRRMMMYYYWWWI.",
            ".IRRRMMMYYYWWWI.",
            ".IRRRMMMYYYWWWI.",
            ".IRRRMMMYYYWWWI.",
            ".IRRRMMMYYYWWWI.",
            ".IRRRMMMYYYWWWI.",
            ".IRRRMMMYYYWWWI.",
            ".IRRRMMMYYYWWWI.",
            ".IIIIIIIIIIIIII.",
            "................",
            "................",
        ]
    )


def favicon_16() -> Image.Image:
    return paint(
        [
            "IIIIIIIIIIIIIIII",
            "ICCCCCCCCCCCCCCI",
            "ICI............I",
            "ICI.II.....II..I",
            "ICI.II....II...I",
            "ICI.II...II....I",
            "ICI.II..II.....I",
            "ICI.II.II......I",
            "ICI.IIII.......I",
            "ICI.II.II......I",
            "ICI.II..II.....I",
            "ICI.II...II....I",
            "ICI.II....II...I",
            "ICI............I",
            "ICCCCCCCCCCCCCCI",
            "IIIIIIIIIIIIIIII",
        ]
    )


def add_card_32() -> Image.Image:
    g = [["." for _ in range(32)] for _ in range(32)]

    def put(x: int, y: int, ch: str) -> None:
        g[y][x] = ch

    # ink frame
    for x in range(5, 27):
        put(x, 5, "I")
        put(x, 26, "I")
    for y in range(5, 27):
        put(5, y, "I")
        put(26, y, "I")

    # cream fill
    for y in range(6, 26):
        for x in range(6, 26):
            put(x, y, "C")

    # orange plus
    for y in range(10, 22):
        for x in range(14, 18):
            put(x, y, "O")
    for y in range(14, 18):
        for x in range(10, 22):
            put(x, y, "O")

    # ink outline around plus
    for y in range(9, 23):
        for x in range(9, 23):
            if g[y][x] != "O":
                continue
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if g[ny][nx] == "C":
                    put(nx, ny, "I")

    return paint(["".join(r) for r in g])


def empty_column_64x48() -> Image.Image:
    w, h = 64, 48
    g = [["." for _ in range(w)] for _ in range(h)]

    def put(x: int, y: int, ch: str) -> None:
        if 0 <= x < w and 0 <= y < h:
            g[y][x] = ch

    def rect(x0: int, y0: int, x1: int, y1: int, fill: str) -> None:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if x in (x0, x1) or y in (y0, y1):
                    put(x, y, "I")
                else:
                    put(x, y, fill)

    rect(6, 8, 57, 32, "C")
    for y in range(9, 32):
        put(23, y, "I")
        put(40, y, "I")
    for y in range(9, 32):
        for x in range(7, 23):
            if g[y][x] == "C":
                put(x, y, "L")
        for x in range(24, 40):
            if g[y][x] == "C":
                put(x, y, "G")
        for x in range(41, 57):
            if g[y][x] == "C":
                put(x, y, "Y")

    rect(10, 12, 19, 18, "W")
    rect(27, 12, 36, 18, "W")
    rect(44, 12, 53, 18, "W")

    # face
    rect(28, 36, 35, 45, "Y")
    put(30, 39, "I")
    put(33, 39, "I")
    put(31, 42, "I")
    put(32, 42, "I")
    put(32, 43, "I")
    for x in range(22, 28):
        put(x, 38, "I")
    for x in range(36, 42):
        put(x, 38, "I")
    put(22, 37, "I")
    put(41, 37, "I")

    return paint(["".join(r) for r in g])


def main() -> None:
    assets: list[tuple[Path, Image.Image]] = [
        (OUT_ICONS / "grip-16.png", grip_16()),
        (OUT_ICONS / "favicon-16.png", favicon_16()),
        (OUT_ICONS / "add-card-32.png", add_card_32()),
        (OUT_UI / "column-accent-16.png", column_accent_16()),
        (OUT_UI / "empty-column-64x48.png", empty_column_64x48()),
    ]

    for path, img in assets:
        save(img, path)
        save(img, path.with_name(f"{path.stem}@2x.png"), scale=2)

    fav = favicon_16()
    save(fav, PUBLIC / "favicon-16.png")
    save(fav, PUBLIC / "favicon-16@2x.png", scale=2)

    palette_path = ROOT / "src" / "assets" / "pixel" / "palette.json"
    palette_path.parent.mkdir(parents=True, exist_ok=True)
    palette_path.write_text(
        json.dumps(
            {
                "name": "sunday-comic",
                "colors": {
                    k: f"#{v[0]:02X}{v[1]:02X}{v[2]:02X}"
                    for k, v in PALETTE.items()
                    if v is not None
                },
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"wrote {palette_path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
