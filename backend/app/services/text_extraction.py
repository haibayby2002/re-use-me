import re

import pymupdf

from app.schemas import ExtractPdfResponse

EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
# Only look near the very top of the document for the header — a stray email
# further down (e.g. a reference's contact) shouldn't get pulled to the front.
HEADER_SEARCH_WINDOW = 20


def _looks_like_name_line(line: str) -> bool:
    trimmed = line.strip()
    if not trimmed or len(trimmed) > 60:
        return False
    if EMAIL_PATTERN.search(trimmed):
        return False
    if re.search(r"\d", trimmed):
        return False
    words = trimmed.split()
    return 2 <= len(words) <= 5


def _move_header_to_top(text: str) -> str:
    """Some PDF layouts (multi-column headers, sidebars) extract the name/
    contact block out of reading order. Find the line with the candidate's
    email near the top of the document and, together with a preceding name-
    looking line, move that block to the very front so downstream parsing
    (parseResumeSections on the frontend) always finds the header first
    instead of it landing mid-document and getting folded into whichever
    section happens to precede it."""
    lines = text.split("\n")
    search_end = min(len(lines), HEADER_SEARCH_WINDOW)
    email_idx = next((i for i in range(search_end) if EMAIL_PATTERN.search(lines[i])), None)
    if email_idx is None:
        return text

    header_idxs = {email_idx}
    for i in range(email_idx - 1, max(-1, email_idx - 4), -1):
        if lines[i].strip() == "":
            continue
        if _looks_like_name_line(lines[i]):
            header_idxs.add(i)
        break

    header = [lines[i] for i in sorted(header_idxs)]
    rest = [line for i, line in enumerate(lines) if i not in header_idxs]
    return "\n".join(header + rest)


def extract_pdf_text(filename: str, data: bytes) -> ExtractPdfResponse:
    doc = pymupdf.open(stream=data, filetype="pdf")
    pages = [page.get_text() for page in doc]
    text = "\n\n".join(p.strip() for p in pages if p.strip())
    text = _move_header_to_top(text)
    return ExtractPdfResponse(filename=filename, text=text, pageCount=len(pages))
