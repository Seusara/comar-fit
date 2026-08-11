"""Create small runtime derivatives while preserving the original PNG masters."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MASTERS = ROOT / "branding" / "masters"
RUNTIME = ROOT / "src" / "assets" / "branding"
PUBLIC = ROOT / "public"
RUNTIME.mkdir(parents=True, exist_ok=True)
PUBLIC.mkdir(parents=True, exist_ok=True)

symbol = Image.open(MASTERS / "comar-fit-symbol.png").convert("RGBA")
symbol = symbol.crop(symbol.getchannel("A").getbbox() or (0, 0, *symbol.size))
symbol.thumbnail((256, 256), Image.Resampling.LANCZOS)
symbol_canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
symbol_canvas.paste(symbol, ((256 - symbol.width) // 2, (256 - symbol.height) // 2), symbol)
symbol_canvas.save(RUNTIME / "comar-fit-symbol.png", "PNG", optimize=True)
(RUNTIME / "comar-fit-symbol.webp").unlink(missing_ok=True)

icon = Image.open(MASTERS / "comar-fit-app-icon.png").convert("RGBA")
app_icon = icon.copy()
app_icon.thumbnail((512, 512), Image.Resampling.LANCZOS)
app_icon.save(PUBLIC / "comar-fit-app-icon.png", "PNG", optimize=True)
icon.thumbnail((192, 192), Image.Resampling.LANCZOS)
icon.save(PUBLIC / "comar-fit-favicon.png", "PNG", optimize=True)

for unused_header_asset in (RUNTIME / "comar-fit-logo.png", RUNTIME / "comar-fit-logo.webp"):
    unused_header_asset.unlink(missing_ok=True)
