from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageOps


ROOT_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT_DIR / "public"
SOURCE_PATH = PUBLIC_DIR / "Gemini_Generated_Image_zfxfttzfxfttzfxf.png"
OUTPUT_DIR = PUBLIC_DIR / "characters"


ASSETS = [
    {
        "output": "login-rainbow.png",
        "box": (558, 107, 1014, 362),
        "width": 320,
        "padding": 20,
    },
    {
        "output": "calendar-empty-rain.png",
        "box": (500, 1278, 830, 1501),
        "width": 220,
        "padding": 18,
    },
    {
        "output": "groups-empty-comfort.png",
        "box": (1084, 501, 1471, 750),
        "width": 280,
        "padding": 18,
    },
    {
        "output": "line-unlinked-thunder.png",
        "box": (909, 1242, 1308, 1577),
        "width": 220,
        "padding": 18,
    },
    {
        "output": "profile-calm-cloud-sun.png",
        "box": (1123, 87, 1437, 388),
        "width": 210,
        "padding": 18,
    },
    {
        "output": "profile-share-phone.png",
        "box": (1553, 495, 1944, 750),
        "width": 260,
        "padding": 18,
    },
    {
        "output": "join-success-cloud-cheer.png",
        "box": (466, 867, 851, 1143),
        "width": 220,
        "padding": 18,
    },
    {
        "output": "save-success-high-five.png",
        "box": (52, 503, 532, 740),
        "width": 280,
        "padding": 18,
    },
]


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    if a == 0:
        return False

    return max(r, g, b) - min(r, g, b) <= 18 and (r + g + b) / 3 >= 180


def clear_background(source: Image.Image) -> Image.Image:
    image = source.copy()
    width, height = image.size
    pixels = image.load()
    visited = bytearray(width * height)
    queue = deque()

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))

    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()

        if x < 0 or y < 0 or x >= width or y >= height:
            continue

        index = y * width + x
        if visited[index]:
            continue

        visited[index] = 1
        if not is_background(pixels[x, y]):
            continue

        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)

        queue.append((x + 1, y))
        queue.append((x - 1, y))
        queue.append((x, y + 1))
        queue.append((x, y - 1))

    return image


def export_asset(image: Image.Image, *, output: str, box: tuple[int, int, int, int], width: int, padding: int) -> None:
    region = image.crop(box)
    alpha_box = region.getchannel("A").getbbox()
    if alpha_box is None:
        raise RuntimeError(f"Could not find foreground for {output}")

    region = region.crop(alpha_box)
    region = ImageOps.expand(region, border=padding, fill=(0, 0, 0, 0))

    if region.width != width:
        resized_height = max(1, round(region.height * width / region.width))
        region = region.resize((width, resized_height), Image.Resampling.LANCZOS)

    region.save(OUTPUT_DIR / output, format="PNG", optimize=True)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE_PATH).convert("RGBA")
    transparent_source = clear_background(source)

    for asset in ASSETS:
        export_asset(transparent_source, **asset)


if __name__ == "__main__":
    main()
