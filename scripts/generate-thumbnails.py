from pathlib import Path
from urllib.parse import quote, unquote
import sqlite3
import hashlib

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "data" / "portfolio.sqlite"
GALLERY_ROOT = ROOT / "src" / "assets" / "gallery"
THUMB_ROOT = ROOT / "uploads" / "thumbs"
THUMB_ROOT.mkdir(parents=True, exist_ok=True)


def fit_cover(image: Image.Image, size: tuple[int, int], top_align: bool) -> Image.Image:
    image = ImageOps.exif_transpose(image).convert("RGB")
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = max(0, (resized.width - target_w) // 2)
    top = 0 if top_align else max(0, (resized.height - target_h) // 2)
    return resized.crop((left, top, left + target_w, top + target_h))


def cover_size(category: str, width: int, height: int) -> tuple[int, int]:
    if "详情" in category or height / max(width, 1) > 1.55:
        return (810, 1440)
    return (900, 1200)


def main() -> None:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        "select id, category, fileUrl from works where mediaType = 'image' and fileUrl like '/legacy-gallery/%'"
    ).fetchall()

    updated = 0
    for row in rows:
        source = GALLERY_ROOT / unquote(row["fileUrl"].replace("/legacy-gallery/", ""))
        if not source.exists():
            continue

        digest = hashlib.sha1(str(source).encode("utf-8")).hexdigest()[:10]
        filename = f"work-{row['id']}-{digest}.webp"
        target = THUMB_ROOT / filename

        if not target.exists():
            with Image.open(source) as image:
                thumb = fit_cover(image, cover_size(row["category"], image.width, image.height), "详情" in row["category"])
                thumb.save(target, "WEBP", quality=78, method=6)

        cover_url = f"/uploads/thumbs/{quote(filename)}"
        connection.execute("update works set coverUrl = ?, updatedAt = datetime('now') where id = ?", (cover_url, row["id"]))
        updated += 1

    connection.commit()
    connection.close()
    print(f"Generated/linked {updated} image thumbnails in {THUMB_ROOT}")


if __name__ == "__main__":
    main()
