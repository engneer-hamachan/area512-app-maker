#!/usr/bin/env python3
"""Makes Area512 image files.

  dot SOURCE OUTPUT.a5d       A dot image from a dot text file or a PNG
  splash SOURCE.png image.h   An app's start screen from a PNG
  preview SOURCE.a5d OUT.png  An enlarged PNG of a dot image, to look at

Dot text file: a `palette` section gives each character a color, a `pixels`
section draws with those characters, and an optional `hitbox` section marks
dots with `x` for Dot.overlap?(..., true). `.` is always transparent.

    palette
    R #E04030
    W #FFFFFF
    pixels
    ..RR..
    .RWWR.
    ..RR..
    hitbox
    ......
    .xxxx.
    ......
"""

import argparse
import os
from pathlib import Path
import struct
import sys

from PIL import Image


DOT_IMAGE_MAGIC = b"A5DI"
DOT_IMAGE_VERSION = 1
DOT_IMAGE_MAX_SIDE = 255
PALETTE_COLOR_COUNT_MAX = 16
TRANSPARENT_CHARACTER = "."
TRANSPARENT_COLOR_INDEX = 0
HITBOX_CHARACTER = "x"
OPAQUE_ALPHA_MINIMUM = 128
SPLASH_WIDTH = 240
SPLASH_HEIGHT = 135
SPLASH_BYTES_PER_LINE = 16
PREVIEW_DOT_SIZE = 8
SECTION_NAMES = ("palette", "pixels", "hitbox")


class AssetError(Exception):
    pass


def rgb888_to_rgb565(red, green, blue):
    return ((red & 0xF8) << 8) | ((green & 0xFC) << 3) | (blue >> 3)


def rgb565_to_rgb888(rgb565):
    red = (rgb565 >> 11) & 0x1F
    green = (rgb565 >> 5) & 0x3F
    blue = rgb565 & 0x1F

    return ((red << 3) | (red >> 2), (green << 2) | (green >> 4), (blue << 3) | (blue >> 2))


def parse_hex_color(text):
    digits = text.lstrip("#")

    if len(digits) != 6:
        raise AssetError(f"not a #RRGGBB color: {text}")

    return tuple(int(digits[index:index + 2], 16) for index in (0, 2, 4))


def read_dot_text_sections(source_path):
    sections = {name: [] for name in SECTION_NAMES}
    current_section = None

    for line in source_path.read_text().splitlines():
        stripped_line = line.strip()

        if not stripped_line:
            continue

        if stripped_line in SECTION_NAMES:
            current_section = stripped_line
        elif current_section is None:
            raise AssetError(f"line before a section name: {line}")
        else:
            sections[current_section].append(stripped_line)

    return sections


def parse_palette_section(palette_lines):
    color_index_by_character = {TRANSPARENT_CHARACTER: TRANSPARENT_COLOR_INDEX}
    palette_colors = [(0, 0, 0)]

    for line in palette_lines:
        character, color_text = line.split()

        if character == TRANSPARENT_CHARACTER or len(character) != 1:
            raise AssetError(f"palette character must be one character, not '.': {line}")

        color_index_by_character[character] = len(palette_colors)
        palette_colors.append(parse_hex_color(color_text))

    return color_index_by_character, palette_colors


def read_dot_text(source_path):
    sections = read_dot_text_sections(source_path)
    color_index_by_character, palette_colors = parse_palette_section(sections["palette"])
    rows = sections["pixels"]

    if not rows:
        raise AssetError("the pixels section is empty")

    if len({len(row) for row in rows}) != 1:
        raise AssetError("all pixels rows must have the same length")

    try:
        pixel_rows = [[color_index_by_character[character] for character in row] for row in rows]
    except KeyError as error:
        raise AssetError(f"character not in the palette: {error}") from error

    hitbox_rows = None

    if sections["hitbox"]:
        if [len(row) for row in sections["hitbox"]] != [len(row) for row in rows]:
            raise AssetError("the hitbox section must have the size of the pixels section")

        hitbox_rows = [
            [character == HITBOX_CHARACTER for character in row] for row in sections["hitbox"]
        ]

    return pixel_rows, palette_colors, hitbox_rows


def read_dot_png(source_path):
    image = Image.open(source_path).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    palette_colors = [(0, 0, 0)]
    color_index_by_color = {}
    pixel_rows = []

    for y in range(height):
        row = []

        for x in range(width):
            red, green, blue, alpha = pixels[x, y]

            if alpha < OPAQUE_ALPHA_MINIMUM:
                row.append(TRANSPARENT_COLOR_INDEX)
                continue

            color = (red, green, blue)

            if color not in color_index_by_color:
                color_index_by_color[color] = len(palette_colors)
                palette_colors.append(color)

            row.append(color_index_by_color[color])

        pixel_rows.append(row)

    return pixel_rows, palette_colors, None


def encode_pixel_rows(pixel_rows):
    encoded = bytearray()

    for row in pixel_rows:
        for x in range(0, len(row), 2):
            encoded.append((row[x] << 4) | row[x + 1])

    return bytes(encoded)


def encode_hitbox_rows(hitbox_rows, width, height):
    row_byte_length = (width + 7) // 8
    encoded = bytearray(row_byte_length * height)

    if hitbox_rows is None:
        return bytes(encoded)

    for y, row in enumerate(hitbox_rows):
        for x, has_hitbox in enumerate(row):
            if has_hitbox:
                encoded[y * row_byte_length + x // 8] |= 0x80 >> (x % 8)

    return bytes(encoded)


def write_output(output_path, output_bytes):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(output_bytes)
    # The container may run as root, and the project's owner must keep editing.
    os.chmod(output_path, 0o666)


def make_dot_image(source_path, output_path):
    if source_path.suffix.lower() == ".png":
        pixel_rows, palette_colors, hitbox_rows = read_dot_png(source_path)
    else:
        pixel_rows, palette_colors, hitbox_rows = read_dot_text(source_path)

    height = len(pixel_rows)
    width = len(pixel_rows[0])

    # A row stores two dots per byte, so the firmware drops an odd last column.
    if width % 2 != 0:
        raise AssetError(f"width must be even, not {width}")

    if width > DOT_IMAGE_MAX_SIDE or height > DOT_IMAGE_MAX_SIDE:
        raise AssetError(f"at most {DOT_IMAGE_MAX_SIDE}x{DOT_IMAGE_MAX_SIDE}, not {width}x{height}")

    if len(palette_colors) > PALETTE_COLOR_COUNT_MAX:
        raise AssetError(
            f"{len(palette_colors) - 1} colors: at most {PALETTE_COLOR_COUNT_MAX - 1} and transparent"
        )

    header = DOT_IMAGE_MAGIC + bytes((DOT_IMAGE_VERSION, width, height, len(palette_colors)))
    palette = b"".join(
        struct.pack("<H", rgb888_to_rgb565(*color)) for color in palette_colors
    )

    write_output(
        output_path,
        header + palette + encode_pixel_rows(pixel_rows) +
        encode_hitbox_rows(hitbox_rows, width, height),
    )
    print(f"{output_path}: {width}x{height}, {len(palette_colors) - 1} colors")


def make_splash(source_path, output_path):
    image = Image.open(source_path).convert("RGBA")
    background = Image.new("RGBA", image.size, (0, 0, 0, 255))
    flattened = Image.alpha_composite(background, image).convert("L")

    if flattened.size != (SPLASH_WIDTH, SPLASH_HEIGHT):
        raise AssetError(f"must be {SPLASH_WIDTH}x{SPLASH_HEIGHT}, not {flattened.size}")

    one_bit_image = flattened.convert("1")
    bitmap_bytes = one_bit_image.tobytes()
    lines = [
        "\t" + ", ".join(
            f"0x{byte:02x}"
            for byte in bitmap_bytes[offset:offset + SPLASH_BYTES_PER_LINE]
        ) + ","
        for offset in range(0, len(bitmap_bytes), SPLASH_BYTES_PER_LINE)
    ]
    header_text = (
        f"// {SPLASH_WIDTH}x{SPLASH_HEIGHT}px\n"
        "const unsigned char app_image [] PROGMEM = {\n" +
        "\n".join(lines) +
        "\n};\n"
    )

    write_output(output_path, header_text.encode())
    print(f"{output_path}: {SPLASH_WIDTH}x{SPLASH_HEIGHT}")


def read_dot_image_rows(source_path):
    file_bytes = source_path.read_bytes()

    if file_bytes[:4] != DOT_IMAGE_MAGIC:
        raise AssetError(f"not a dot image: {source_path}")

    width, height, palette_color_count = file_bytes[5], file_bytes[6], file_bytes[7]
    pixel_offset = 8 + palette_color_count * 2
    palette = [
        rgb565_to_rgb888(struct.unpack_from("<H", file_bytes, 8 + index * 2)[0])
        for index in range(palette_color_count)
    ]
    rows = []

    for y in range(height):
        row = []

        for x in range(width):
            pixel_byte = file_bytes[pixel_offset + y * (width // 2) + x // 2]
            row.append(pixel_byte >> 4 if x % 2 == 0 else pixel_byte & 0x0F)

        rows.append(row)

    return rows, palette


def make_preview(source_path, output_path):
    rows, palette = read_dot_image_rows(source_path)
    preview = Image.new("RGBA", (len(rows[0]), len(rows)))

    for y, row in enumerate(rows):
        for x, color_index in enumerate(row):
            if color_index != TRANSPARENT_COLOR_INDEX:
                preview.putpixel((x, y), (*palette[color_index], 255))

    enlarged_size = (len(rows[0]) * PREVIEW_DOT_SIZE, len(rows) * PREVIEW_DOT_SIZE)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    preview.resize(enlarged_size, Image.NEAREST).save(output_path)
    os.chmod(output_path, 0o666)
    print(output_path)


COMMANDS = {"dot": make_dot_image, "splash": make_splash, "preview": make_preview}


def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("command", choices=COMMANDS)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    arguments = parser.parse_args()

    try:
        COMMANDS[arguments.command](arguments.source, arguments.output)
    except (AssetError, OSError, ValueError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    sys.exit(main())
