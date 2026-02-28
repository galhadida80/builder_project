"""Thumbnail generation service for PDFs and images."""

import io

import fitz  # PyMuPDF
from PIL import Image


def generate_thumbnail(file_bytes: bytes, file_type: str, max_size: tuple[int, int] = (300, 300)) -> bytes:
    """Generate a thumbnail from a PDF or image file.

    Args:
        file_bytes: Raw bytes of the file
        file_type: MIME type of the file (e.g., 'application/pdf', 'image/jpeg', 'image/png')
        max_size: Maximum dimensions (width, height) for the thumbnail (default: 300x300)

    Returns:
        Thumbnail image as PNG bytes

    Raises:
        ValueError: If the file type is not supported or file is invalid
    """
    if file_type == "application/pdf":
        return _generate_pdf_thumbnail(file_bytes, max_size)
    elif file_type.startswith("image/"):
        return _generate_image_thumbnail(file_bytes, max_size)
    else:
        raise ValueError(f"Unsupported file type for thumbnail generation: {file_type}")


def _generate_pdf_thumbnail(pdf_bytes: bytes, max_size: tuple[int, int]) -> bytes:
    """Generate a thumbnail from the first page of a PDF.

    Args:
        pdf_bytes: Raw bytes of the PDF file
        max_size: Maximum dimensions (width, height) for the thumbnail

    Returns:
        Thumbnail image as PNG bytes

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

    # Get the first page
    page = doc[0]

    # Calculate zoom to fit within max_size while maintaining aspect ratio
    page_rect = page.rect
    page_width = page_rect.width
    page_height = page_rect.height

    # Calculate scale factors
    width_scale = max_size[0] / page_width
    height_scale = max_size[1] / page_height
    scale = min(width_scale, height_scale)

    # Create matrix for scaling
    mat = fitz.Matrix(scale, scale)

    # Render page to pixmap
    pix = page.get_pixmap(matrix=mat)

    # Convert pixmap to PNG bytes
    thumbnail_bytes = pix.tobytes("png")

    doc.close()
    return thumbnail_bytes


def _generate_image_thumbnail(image_bytes: bytes, max_size: tuple[int, int]) -> bytes:
    """Generate a thumbnail from an image file.

    Args:
        image_bytes: Raw bytes of the image file
        max_size: Maximum dimensions (width, height) for the thumbnail

    Returns:
        Thumbnail image as PNG bytes

    Raises:
        ValueError: If the image is invalid or cannot be processed
    """
    try:
        # Open image from bytes
        image = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB if necessary (e.g., for RGBA or palette images)
        if image.mode not in ('RGB', 'L'):
            image = image.convert('RGB')

        # Create thumbnail (maintains aspect ratio)
        image.thumbnail(max_size, Image.Resampling.LANCZOS)

        # Save to bytes as PNG
        output = io.BytesIO()
        image.save(output, format='PNG', optimize=True)
        thumbnail_bytes = output.getvalue()

        return thumbnail_bytes

    except Exception as e:
        raise ValueError(f"Invalid image file: {str(e)}")
