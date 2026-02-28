"""PDF processing service for splitting and extracting pages."""

import io

import fitz  # PyMuPDF


def split_pdf_pages(pdf_bytes: bytes) -> list[bytes]:
    """Split a multi-page PDF into individual page PDFs.

    Args:
        pdf_bytes: Raw bytes of the PDF file

    Returns:
        List of bytes objects, each containing a single-page PDF

    Raises:
        ValueError: If the PDF is invalid or cannot be processed
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise ValueError(f"Invalid PDF file: {str(e)}")

    if doc.page_count == 0:
        doc.close()
        raise ValueError("PDF contains no pages")

    pages = []
    for page_num in range(doc.page_count):
        # Create a new PDF with just this page
        single_page_doc = fitz.open()
        single_page_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)

        # Convert to bytes
        page_bytes = single_page_doc.tobytes()
        pages.append(page_bytes)

        single_page_doc.close()

    doc.close()
    return pages


def extract_text_from_page(page_bytes: bytes) -> str:
    """Extract text content from a single-page PDF.

    Args:
        page_bytes: Raw bytes of a single-page PDF

    Returns:
        Extracted text content as a string

    Raises:
        ValueError: If the PDF is invalid or cannot be processed
    """
    try:
        doc = fitz.open(stream=page_bytes, filetype="pdf")
    except Exception as e:
        raise ValueError(f"Invalid PDF file: {str(e)}")

    if doc.page_count == 0:
        doc.close()
        raise ValueError("PDF contains no pages")

    # Extract text from the first (and should be only) page
    page = doc[0]
    text = page.get_text()

    doc.close()
    return text


def extract_page_image(page_bytes: bytes, dpi: int = 150) -> bytes:
    """Extract a single page as a PNG image.

    Args:
        page_bytes: Raw bytes of a single-page PDF
        dpi: Resolution for the output image (default: 150)

    Returns:
        PNG image as bytes

    Raises:
        ValueError: If the PDF is invalid or cannot be processed
    """
    try:
        doc = fitz.open(stream=page_bytes, filetype="pdf")
    except Exception as e:
        raise ValueError(f"Invalid PDF file: {str(e)}")

    if doc.page_count == 0:
        doc.close()
        raise ValueError("PDF contains no pages")

    page = doc[0]
    # Render page to pixmap at specified DPI
    zoom = dpi / 72  # 72 DPI is the default
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)

    # Convert pixmap to PNG bytes
    img_bytes = pix.tobytes("png")

    doc.close()
    return img_bytes


def get_pdf_page_count(pdf_bytes: bytes) -> int:
    """Get the number of pages in a PDF.

    Args:
        pdf_bytes: Raw bytes of the PDF file

    Returns:
        Number of pages in the PDF

    Raises:
        ValueError: If the PDF is invalid or cannot be processed
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise ValueError(f"Invalid PDF file: {str(e)}")

    page_count = doc.page_count
    doc.close()

    return page_count
