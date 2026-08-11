"""Create small runtime derivatives while preserving the original PNG masters."""
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / "branding" / "masters"
RUNTIME = ROOT / "src" / "assets" / "branding"
PUBLIC = ROOT / "public"
RUNTIME.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)


def content_bbox(image: Image.Image):
    rgb = image.convert("RGB")
    background = Image.new("RGB", rgb.size, rgb.getpixel((0, 0)))
    difference = ImageChops.difference(rgb, background).convert("L")
    return difference.point(lambda value: 255 if value > 8 else 0).getbbox() or (0, 0, *image.size)


logo = Image.open(MASTERS / "comar-fit-logo.png").convert("RGB")
logo = logo.crop(content_bbox(logo))
logo.thumbnail((640, 240), Image.Resampling.LANCZOS)
logo_canvas = Image.new("RGB", (640, 240), (5, 7, 13))
logo_canvas.paste(logo, ((640 - logo.width) // 2, (240 - logo.height) // 2))
logo_canvas.save(RUNTIME / "comar-fit-logo.webp", "WEBP", quality=88, method=6)

symbol = Image.open(MASTERS / "comar-fit-symbol.png").convert("RGBA")
symbol = symbol.crop(symbol.getchannel("A").getbbox() or (0, 0, *symbol.size))
symbol.thumbnail((256, 256), Image.Resampling.LANCZOS)
symbol_canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
symbol_canvas.paste(symbol, ((256 - symbol.width) // 2, (256 - symbol.height) // 2), symbol)
symbol_canvas.save(RUNTIME / "comar-fit-symbol.webp", "WEBP", lossless=True, method=6)

icon = Image.open(MASTERS / "comar-fit-app-icon.png").convert("RGBA")
app_icon = icon.copy()
app_icon.thumbnail((512, 512), Image.Resampling.LANCZOS)
app_icon.save(PUBLIC / "comar-fit-app-icon.png", "PNG", optimize=True)
icon.thumbnail((192, 192), Image.Resampling.LANCZOS)
icon.save(PUBLIC / "comar-fit-favicon.png", "PNG", optimize=True)

for legacy_runtime_png in (RUNTIME / "comar-fit-logo.png", RUNTIME / "comar-fit-symbol.png"):
    legacy_runtime_png.unlink(missing_ok=True)
