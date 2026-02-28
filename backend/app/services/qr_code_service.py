import base64
import io
import os
from typing import Literal
from uuid import UUID

import qrcode
import qrcode.image.svg
from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from weasyprint import HTML

from app.config import get_settings
from app.models.area import Area
from app.models.equipment import Equipment
from app.models.material import Material
from app.utils import utcnow

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")

env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html"]),
)

STRINGS = {
    "he": {
        "page_title": "תוויות QR לציוד וחומרים",
        "no_labels": "לא נמצאו פריטים להדפסה",
        "entity_types": {
            "equipment": "ציוד",
            "material": "חומר",
            "area": "אזור",
        },
    },
    "en": {
        "page_title": "QR Labels for Equipment & Materials",
        "no_labels": "No items to print",
        "entity_types": {
            "equipment": "Equipment",
            "material": "Material",
            "area": "Area",
        },
    },
}


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

    async def generate_bulk_qr_pdf(
        self,
        items: list[dict],
        project,
        language: str = "he",
    ) -> bytes:
        """
        Generate a printable PDF sheet with QR code labels for multiple items.

        Args:
            items: List of dicts with entity_type and entity_id
            project: Project object for header information
            language: Language code (he or en)

        Returns:
            PDF bytes
        """
        s = STRINGS.get(language, STRINGS["he"])
        direction = "rtl" if language == "he" else "ltr"
        today = utcnow().strftime("%d/%m/%Y")

        labels = []
        for item in items:
            entity_type = item.get("entity_type")
            entity_id = item.get("entity_id")

            if not entity_type or not entity_id:
                continue

            entity = await self._fetch_entity(entity_type, entity_id)
            if not entity:
                continue

            qr_code_data = self.generate_qr_code(entity_type, entity_id, "png", 300)
            qr_code_base64 = qr_code_data.split(",")[1] if "," in qr_code_data else qr_code_data

            label_data = {
                "entity_type": entity_type,
                "entity_id": str(entity_id),
                "qr_code_base64": qr_code_base64,
                "name": self._get_entity_name(entity, entity_type),
                "code": self._get_entity_code(entity, entity_type),
                "info": self._get_entity_info(entity, entity_type),
            }
            labels.append(label_data)

        template = env.get_template("qr_code_sheet.html")
        html_content = template.render(
            s=s,
            direction=direction,
            project_name=project.name,
            project_code=getattr(project, "code", ""),
            generated_date=today,
            labels=labels,
        )

        pdf_bytes = HTML(string=html_content, base_url=TEMPLATES_DIR).write_pdf()
        return pdf_bytes

    async def _fetch_entity(self, entity_type: str, entity_id: UUID):
        """Fetch entity from database by type and ID."""
        if entity_type == "equipment":
            result = await self.db.execute(
                select(Equipment).where(Equipment.id == entity_id)
            )
            return result.scalar_one_or_none()
        elif entity_type == "material":
            result = await self.db.execute(
                select(Material).where(Material.id == entity_id)
            )
            return result.scalar_one_or_none()
        elif entity_type == "area":
            result = await self.db.execute(
                select(Area).where(Area.id == entity_id)
            )
            return result.scalar_one_or_none()
        return None

    def _get_entity_name(self, entity, entity_type: str) -> str:
        """Extract display name from entity."""
        if entity_type == "equipment":
            return getattr(entity, "equipment_type", "-")
        elif entity_type == "material":
            return getattr(entity, "material_type", "-")
        elif entity_type == "area":
            return getattr(entity, "area_code", "-")
        return "-"

    def _get_entity_code(self, entity, entity_type: str) -> str:
        """Extract code from entity."""
        if entity_type == "equipment":
            return getattr(entity, "equipment_code", "")
        elif entity_type == "material":
            return getattr(entity, "material_code", "")
        elif entity_type == "area":
            return f"Floor {getattr(entity, 'floor_number', '')}"
        return ""

    def _get_entity_info(self, entity, entity_type: str) -> str:
        """Extract additional info from entity."""
        if entity_type == "equipment":
            manufacturer = getattr(entity, "manufacturer", "")
            model = getattr(entity, "model_number", "")
            return f"{manufacturer} {model}".strip()
        elif entity_type == "material":
            supplier = getattr(entity, "supplier", "")
            return supplier
        elif entity_type == "area":
            units = getattr(entity, "total_units", "")
            return f"{units} units" if units else ""
        return ""
