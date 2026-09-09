import json
import os
from pathlib import Path
from copy import deepcopy

from utils.logging_utils import get_logger

logger = get_logger(__name__)


class SceneRepository:
    """Firestore repository with a local JSON fallback.

    Demo mode keeps development independent of Google Cloud.
    """

    def __init__(self):
        self.demo_mode = os.getenv("ECHO_DEMO_MODE", "true").lower() == "true"
        self.local_path = Path("data/local_firestore.json")

        if self.demo_mode:
            self.local_path.parent.mkdir(exist_ok=True)
            if not self.local_path.exists():
                self.local_path.write_text("{}", encoding="utf-8")
        else:
            from google.cloud import firestore
            self.client = firestore.Client()

    def _load(self):
        return json.loads(self.local_path.read_text(encoding="utf-8"))

    def _save(self, data):
        self.local_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    def upsert_reference_lines(self, scene_id, lines):
        if self.demo_mode:
            data = self._load()
            scene = data.setdefault(scene_id, {
                "scene_id": scene_id,
                "reference_lines": [],
                "takes": [],
            })
            scene["reference_lines"] = [
                {"character": x["character"], "line": x["reference_line"]}
                for x in lines
            ]
            self._save(data)
            return

        ref = self.client.collection("scenes").document(scene_id)
        ref.set({
            "scene_id": scene_id,
            "reference_lines": [
                {"character": x["character"], "line": x["reference_line"]}
                for x in lines
            ],
        }, merge=True)

    def get_scene(self, scene_id):
        if self.demo_mode:
            return self._load().get(scene_id)

        snap = self.client.collection("scenes").document(scene_id).get()
        return snap.to_dict() if snap.exists else None

    def upsert_take(self, scene_id, take_record):
        """Persist a classified take using the same local/Firestore scene contract."""
        if self.demo_mode:
            data = self._load()
            scene = data.setdefault(scene_id, {
                "scene_id": scene_id,
                "reference_lines": [],
                "takes": [],
            })
            takes = scene.setdefault("takes", [])
            # Idempotent by take number + character.
            takes[:] = [
                t for t in takes
                if not (
                    t.get("take_number") == take_record.get("take_number")
                    and t.get("character") == take_record.get("character")
                )
            ]
            takes.append(take_record)
            self._save(data)
            return

        ref = self.client.collection("scenes").document(scene_id)
        snap = ref.get()
        data = snap.to_dict() if snap.exists else {
            "scene_id": scene_id,
            "reference_lines": [],
            "takes": [],
        }
        takes = data.get("takes", [])
        takes = [
            t for t in takes
            if not (
                t.get("take_number") == take_record.get("take_number")
                and t.get("character") == take_record.get("character")
            )
        ]
        takes.append(take_record)
        data["takes"] = takes
        ref.set(data, merge=True)

    def list_scenes(self):
        if self.demo_mode:
            return list(self._load().values())

        return [doc.to_dict() for doc in self.client.collection("scenes").stream()]
