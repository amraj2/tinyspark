"""Generate the PWA icons (a yellow jelly-bean on purple) with no third-party libraries.

    python -m tools.make_icons
"""

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent / "static" / "icons"
VIOLET, VIOLET_D, SUN, INK, WHITE = (91, 43, 214), (63, 27, 156), (255, 194, 51), (29, 17, 70), (255, 255, 255)


def in_round_rect(x, y, x0, y0, x1, y1, r):
    cx, cy = min(max(x, x0 + r), x1 - r), min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r and x0 <= x <= x1 and y0 <= y <= y1


def pixel(u, v, rounded):
    """Colour at unit-square coordinates (u, v), or None for transparent."""
    if rounded and not in_round_rect(u, v, 0, 0, 1, 1, 0.22):
        return None
    col = VIOLET if v < 0.62 else VIOLET_D if rounded else VIOLET
    if in_round_rect(u, v, 0.31, 0.17, 0.69, 0.83, 0.19):     # bean body
        col = SUN
        for ex in (0.42, 0.58):                                  # eyes
            if (u - ex) ** 2 + (v - 0.38) ** 2 <= 0.052 ** 2:
                col = WHITE
            if (u - ex - 0.012) ** 2 + (v - 0.385) ** 2 <= 0.026 ** 2:
                col = INK
        if 0.44 < u < 0.56 and 0.5 < v < 0.535 and (u - 0.5) ** 2 / 0.06 ** 2 + (v - 0.5) ** 2 / 0.04 ** 2 < 1.2:
            col = INK
    return col


def render(size, rounded=True, pad=0.0, ss=3):
    """Supersampled RGBA render. ``pad`` shrinks the artwork toward the centre (for maskable icons)."""
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            r = g = b = a = 0
            for sy in range(ss):
                for sx in range(ss):
                    u = (px + (sx + 0.5) / ss) / size
                    v = (py + (sy + 0.5) / ss) / size
                    if pad:
                        u, v = 0.5 + (u - 0.5) / (1 - pad), 0.5 + (v - 0.5) / (1 - pad)
                        c = pixel(u, v, False) if 0 <= u <= 1 and 0 <= v <= 1 else VIOLET
                    else:
                        c = pixel(u, v, rounded)
                    if c is not None:
                        r, g, b, a = r + c[0], g + c[1], b + c[2], a + 255
            n = ss * ss
            covered = a / 255
            row += bytes((int(r / covered) if covered else 0, int(g / covered) if covered else 0, int(b / covered) if covered else 0, int(a / n)))
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + r for r in rows)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    write_png(OUT / "icon-192.png", 192, render(192))
    write_png(OUT / "icon-512.png", 512, render(512))
    write_png(OUT / "maskable-512.png", 512, render(512, pad=0.2))
    write_png(OUT / "apple-touch-icon.png", 180, render(180, rounded=False))   # iOS rounds the corners itself
    print("icons written to", OUT)


if __name__ == "__main__":
    main()
