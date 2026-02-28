import base64
import io
from typing import Literal
from uuid import UUID

import qrcode
import qrcode.image.svg
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings


class QRCodeService:
    """Service for generating QR codes for equipment, materials, and areas."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()

    def generate_qr_code(
        self,
        entity_type: str,
        entity_id: UUID,
        format: Literal["png", "svg"] = "png",
        size: int = 300,
    ) -> str:
        """
        Generate a QR code for an entity.

        Args:
            entity_type: Type of entity (equipment, material, area)
            entity_id: UUID of the entity
            format: Output format (png or svg)
            size: Size of the QR code in pixels (100-1000)

        Returns:
            Base64-encoded PNG data or SVG string
        """
        # Build the scan URL that the QR code will encode
        scan_url = f"{self.settings.frontend_base_url}/scan/{entity_type}/{entity_id}"

        if format == "svg":
            return self._generate_svg(scan_url, size)
        else:
            return self._generate_png(scan_url, size)

    def _generate_png(self, data: str, size: int) -> str:
        """Generate PNG QR code and return base64-encoded data."""
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # Resize to requested size
        img = img.resize((size, size))

        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.read()).decode("utf-8")

        return f"data:image/png;base64,{img_base64}"

    def _generate_svg(self, data: str, size: int) -> str:
        """Generate SVG QR code and return as string."""
        factory = qrcode.image.svg.SvgPathImage
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            image_factory=factory,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image()

        # Convert to string
        buffer = io.BytesIO()
        img.save(buffer)
        buffer.seek(0)
        svg_string = buffer.read().decode("utf-8")

        # Add width/height attributes for requested size
        svg_string = svg_string.replace(
            '<svg',
            f'<svg width="{size}" height="{size}"',
            1
        )

        return svg_string

    async def generate_bulk_qr_codes(
        self,
        items: list[dict],
        format: Literal["png", "svg"] = "png",
        size: int = 300,
    ) -> list[dict]:
        """
        Generate QR codes for multiple items.

        Args:
            items: List of dicts with entity_type and entity_id
            format: Output format (png or svg)
            size: Size of the QR code in pixels

        Returns:
            List of dicts with entity info and qr_code_data
        """
        results = []
        for item in items:
            entity_type = item.get("entity_type")
            entity_id = item.get("entity_id")

            if not entity_type or not entity_id:
                continue

            qr_data = self.generate_qr_code(entity_type, entity_id, format, size)

            results.append({
                "entity_type": entity_type,
                "entity_id": str(entity_id),
                "qr_code_data": qr_data,
                "format": format,
                "size": size,
            })

        return results
