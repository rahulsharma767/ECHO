from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

from data.repository import SceneRepository
from utils.logging_utils import get_logger

logger = get_logger(__name__)


class ReportAgent:
    def __init__(self, repository: SceneRepository):
        self.repository = repository
        self.output_dir = Path("reports")
        self.output_dir.mkdir(exist_ok=True)

    def generate(self, scene_id: str) -> str:
        scene = self.repository.get_scene(scene_id)
        if scene is None:
            raise KeyError(scene_id)

        path = self.output_dir / f"{scene_id}_continuity_report.pdf"
        doc = SimpleDocTemplate(str(path), pagesize=A4)
        styles = getSampleStyleSheet()
        story = [
            Paragraph(f"ECHO Continuity Report — {scene_id}", styles["Title"]),
            Spacer(1, 12),
        ]

        reference_rows = [["Character", "Reference Line"]]
        for item in scene.get("reference_lines", []):
            reference_rows.append([item["character"], item["line"]])

        if len(reference_rows) > 1:
            table = Table(reference_rows, repeatRows=1)
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]))
            story += [Paragraph("Reference dialogue", styles["Heading2"]), table, Spacer(1, 16)]

        take_rows = [["Take", "Character", "Line", "Status", "Confidence"]]
        for take in scene.get("takes", []):
            take_rows.append([
                str(take.get("take_number", "")),
                take.get("character", ""),
                take.get("line", ""),
                take.get("status", ""),
                str(take.get("confidence", "")),
            ])

        if len(take_rows) > 1:
            table = Table(take_rows, repeatRows=1)
            table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]))
            story += [Paragraph("Take ledger", styles["Heading2"]), table]

        doc.build(story)
        logger.info("report_generated scene_id=%s path=%s", scene_id, path)
        return str(path)
