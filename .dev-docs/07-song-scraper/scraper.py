from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import json
import re
import time

# ==========================================
# CONFIG
# ==========================================

BASE_URL = "https://alkitab.app/LS/{}"

START_SONG = 501
END_SONG = 525

OUTPUT_FILE = ".docs/07-song-scraper/songs-import-501-525.json"

DEFAULT_HYMNAL_ID = 9  # Sesuaikan dengan hymnal_id untuk LS di database Anda

DEFAULT_CATEGORY = "Lagu Sion"

DEFAULT_TAGS = "Lagu Sion, LS, GMAHK"

# ==========================================
# STORAGE
# ==========================================

songs = []

# ==========================================
# HELPERS
# ==========================================


def clean_text(text):

    text = text.replace("\r", "")

    text = text.replace("'", "'")

    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        cleaned = re.sub(r"\s+", " ", line)
        cleaned_lines.append(cleaned.strip())
    return "\n".join(cleaned_lines).strip()


def normalize_number(number):

    number = str(number).strip()

    if number.isdigit():
        return str(int(number))

    return number


# ==========================================
# PLAYWRIGHT
# ==========================================

with sync_playwright() as p:

    browser = p.chromium.launch(
        headless=True
    )

    page = browser.new_page()

    # ======================================
    # LOOP SONG
    # ======================================

    for nomor in range(START_SONG, END_SONG + 1):

        url = BASE_URL.format(nomor)

        print(f"\nMengambil lagu {nomor}...")

        try:

            page.goto(
                url,
                timeout=60000
            )

            page.wait_for_timeout(2000)

            html = page.content()

            soup = BeautifulSoup(
                html,
                "html.parser"
            )

            # ==================================
            # TITLE
            # ==================================

            judul_div = soup.find(
                "div",
                class_="judul"
            )

            if not judul_div:

                print("Judul tidak ditemukan")

                continue

            judul_full = clean_text(
                judul_div.get_text()
            )

            # Hapus prefix:
            # LS 1 JUDUL
            judul = re.sub(
                r"^LS\s+\d+\s*",
                "",
                judul_full
            ).strip()

            # ==================================
            # VERSES / CHORUS
            # ==================================

            bait_list = soup.find_all(
                "div",
                class_="bait"
            )

            if not bait_list:

                print("Bait tidak ditemukan")

                continue

            lyrics_parts = []
            verse_count = 0

            for bait in bait_list:

                # ==============================
                # DETECT CHORUS
                # ==============================

                bait_classes = bait.get(
                    "class",
                    []
                )

                is_reff = any(
                    "reff" in cls.lower()
                    for cls in bait_classes
                )

                if is_reff:
                    stanza_tag = "[CHORUS]"
                else:
                    verse_count += 1
                    stanza_tag = f"[VERSE {verse_count}]"

                # ==============================
                # GET LINES
                # ==============================

                lines = []

                baris_list = bait.find_all(
                    "div",
                    class_="baris"
                )

                for baris in baris_list:

                    text = clean_text(
                        baris.get_text()
                    )

                    if text:
                        lines.append(text)

                if not lines:
                    continue

                # ==============================
                # BUILD STANZA
                # ==============================

                stanza_text = (
                    stanza_tag
                    + "\n"
                    + "\n".join(lines)
                )

                lyrics_parts.append(
                    stanza_text
                )

            # ==================================
            # FINAL LYRICS RAW
            # ==================================

            lyrics_raw = "\n\n".join(
                lyrics_parts
            )

            # ==================================
            # SONG OBJECT
            # ==================================

            song = {

                # REQUIRED
                "hymnal_id": DEFAULT_HYMNAL_ID,

                "number": normalize_number(
                    nomor
                ),

                "title": judul,

                "lyrics_raw": lyrics_raw,

                # OPTIONAL METADATA
                "alternate_title": "",

                "author": "",

                "composer": "",

                "key_note": "",

                "time_signature": "",

                "tempo": "",

                "category": DEFAULT_CATEGORY,

                "tags": DEFAULT_TAGS

            }

            songs.append(song)

            print(f"Berhasil: {judul}")

            time.sleep(1)

        except Exception as e:

            print(f"Error {nomor}: {e}")

    browser.close()

# ==========================================
# SAVE JSON
# ==========================================

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        songs,
        f,
        ensure_ascii=False,
        indent=2
    )

print("\n======================")
print(f"Total lagu: {len(songs)}")
print(f"Tersimpan: {OUTPUT_FILE}")
print("======================")