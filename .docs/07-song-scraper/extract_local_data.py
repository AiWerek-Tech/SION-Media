from bs4 import BeautifulSoup
import json
import re
import os

# ==========================================
# CONFIG
# ==========================================

HTML_FILE = ".docs/07-song-scraper/play.lagusion.org/Lagu Sion Plus - Praise God O My Soul.html"
OUTPUT_FILE = ".docs/07-song-scraper/songs_full_metadata.json"

# ==========================================
# HELPERS
# ==========================================

def clean_html(text):
    if not text:
        return ""
    # Remove HTML tags
    clean = re.sub(r'<.*?>', '', text)
    # Replace &nbsp; and other entities
    clean = clean.replace('&nbsp;', ' ')
    # Remove multiple whitespaces
    clean = re.sub(r'\s+', ' ', clean)
    return clean.strip()

def parse_metadata(meta_span):
    """
    Parses the first span content which contains multiple <p> tags or <br> separated text.
    """
    data = {
        "english_title": "",
        "composer": "",
        "arranger": "",
        "key_signature": "",
        "time_signature": "",
        "bible_verse": ""
    }
    
    # Try to find <p> tags first
    p_tags = meta_span.find_all("p")
    if p_tags:
        # First <p> is usually technical metadata
        tech_text = p_tags[0].decode_contents()
        tech_parts = re.split(r'<br/?>|\n', tech_text)
        
        for part in tech_parts:
            part = clean_html(part)
            if "English:" in part:
                data["english_title"] = part.replace("English:", "").strip()
            elif "Composer:" in part:
                data["composer"] = part.replace("Composer:", "").strip()
            elif "Arranger:" in part:
                data["arranger"] = part.replace("Arranger:", "").strip()
            else:
                # Look for signature like "1b=F 3/4" or "2#=D"
                sig_match = re.search(r'(\d+[b#]=[A-G])(?:\s+(\d+/\d+))?', part)
                if sig_match:
                    data["key_signature"] = sig_match.group(1)
                    if sig_match.group(2):
                        data["time_signature"] = sig_match.group(2)

        # Subsequent <p> tags are usually Bible Verses
        if len(p_tags) > 1:
            verses = [clean_html(p.get_text()) for p in p_tags[1:]]
            data["bible_verse"] = " ".join(verses)
            
    else:
        # Fallback for plain text with <br>
        content = meta_span.decode_contents()
        parts = re.split(r'<br/?>|\n', content)
        for part in parts:
            part = clean_html(part)
            if "English:" in part:
                data["english_title"] = part.replace("English:", "").strip()
            elif "Composer:" in part:
                data["composer"] = part.replace("Composer:", "").strip()
            elif "Arranger:" in part:
                data["arranger"] = part.replace("Arranger:", "").strip()
            else:
                sig_match = re.search(r'(\d+[b#]=[A-G])(?:\s+(\d+/\d+))?', part)
                if sig_match:
                    data["key_signature"] = sig_match.group(1)
                    if sig_match.group(2):
                        data["time_signature"] = sig_match.group(2)

    return data

# ==========================================
# MAIN SCRAPER
# ==========================================

def main():
    if not os.path.exists(HTML_FILE):
        print(f"Error: File {HTML_FILE} not found.")
        return

    print(f"Reading {HTML_FILE}...")
    with open(HTML_FILE, 'r', encoding='utf-8') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Find all song items
    song_items = soup.find_all("div", class_="judul-item")
    print(f"Found {len(song_items)} potential song items.")

    extracted_songs = []

    for item in song_items:
        try:
            song_id = item.get("data-id")
            
            # Title element
            title_el = item.find("h6", class_="judul_pencarian")
            if not title_el:
                continue
                
            full_title = clean_html(title_el.get_text())
            title_match = re.match(r'(\d+)\.\s*(.*)', full_title)
            if title_match:
                number = title_match.group(1)
                title = title_match.group(2)
            else:
                number = song_id
                title = full_title

            # Metadata and Lyrics are in .all_lirik_pencarian
            meta_div = item.find("div", class_="all_lirik_pencarian")
            spans = meta_div.find_all("span") if meta_div else []
            
            metadata = {
                "english_title": "", "composer": "", "arranger": "",
                "key_signature": "", "time_signature": "", "bible_verse": ""
            }
            if len(spans) > 0:
                metadata = parse_metadata(spans[0])
            
            # Lyrics from data-lyrics attribute
            lyrics_raw = item.find("span", class_="add_to_playlist").get("data-lyrics") if item.find("span", class_="add_to_playlist") else ""
            
            # If data-lyrics is short or missing, try to collect all lyrics from spans
            if not lyrics_raw and len(spans) > 2:
                # Combine all spans from index 2 onwards as lyrics
                lyrics_list = [clean_html(s.get_text()) for s in spans[2:] if s.get_text() != "null"]
                lyrics_raw = "\n\n".join(lyrics_list)

            song_data = {
                "id": song_id,
                "number": number,
                "title": title,
                "english_title": metadata["english_title"],
                "composer": metadata["composer"],
                "arranger": metadata["arranger"],
                "key_signature": metadata["key_signature"],
                "time_signature": metadata["time_signature"],
                "bible_verse": metadata["bible_verse"],
                "lyrics": lyrics_raw,
                "album": "LS. Edisi Baru"
            }
            
            extracted_songs.append(song_data)
            
        except Exception as e:
            print(f"Error parsing item {song_id}: {e}")

    # Save to JSON
    print(f"Saving {len(extracted_songs)} songs to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(extracted_songs, f, indent=4, ensure_ascii=False)

    print("Extraction complete!")

if __name__ == "__main__":
    main()
