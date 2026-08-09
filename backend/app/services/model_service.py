import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Model, load_model

from app.core.config import get_settings

DEFAULT_CLASS_NAMES = [
    "Pepper__bell___Bacterial_spot",
    "Pepper__bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Tomato_Bacterial_spot",
    "Tomato_Early_blight",
    "Tomato_Late_blight",
    "Tomato_Leaf_Mold",
    "Tomato_Septoria_leaf_spot",
    "Tomato_Spider_mites_Two_spotted_spider_mite",
    "Tomato__Target_Spot",
    "Tomato__Tomato_YellowLeaf__Curl_Virus",
    "Tomato__Tomato_mosaic_virus",
    "Tomato_healthy",
]

_model: Model | None = None
_input_size: tuple[int, int] | None = None
_class_names: list[str] = []


def _resolve_class_names(model_output_classes: int | None) -> list[str]:
    settings = get_settings()
    class_file = settings.class_names_file
    if class_file.exists():
        loaded = json.loads(class_file.read_text(encoding="utf-8"))
        if not isinstance(loaded, list) or not all(isinstance(item, str) for item in loaded):
            raise RuntimeError("CLASS_NAMES_PATH must contain a JSON array of strings.")
        class_names = loaded
    else:
        class_names = DEFAULT_CLASS_NAMES

    if model_output_classes is not None and len(class_names) != model_output_classes:
        raise RuntimeError(
            f"Class mapping mismatch. Model outputs {model_output_classes} classes, "
            f"but class mapping has {len(class_names)} classes."
        )
    return class_names


def load_model_once() -> None:
    global _model, _input_size, _class_names
    settings = get_settings()
    model_path = settings.model_file
    if not model_path.exists():
        raise RuntimeError(f"Model file not found at: {model_path}")

    loaded_model = load_model(model_path)
    model_input_shape = loaded_model.input_shape

    if isinstance(model_input_shape, list):
        model_input_shape = model_input_shape[0]

    if len(model_input_shape) < 3 or model_input_shape[1] is None or model_input_shape[2] is None:
        raise RuntimeError(f"Unable to infer model image input size from shape: {model_input_shape}")

    output_shape = loaded_model.output_shape
    if isinstance(output_shape, list):
        output_shape = output_shape[0]
    output_classes = int(output_shape[-1]) if output_shape and output_shape[-1] else None

    _class_names = _resolve_class_names(output_classes)
    _input_size = (int(model_input_shape[1]), int(model_input_shape[2]))
    _model = loaded_model


def is_loaded() -> bool:
    return _model is not None and _input_size is not None and len(_class_names) > 0


def get_input_size() -> tuple[int, int]:
    if _input_size is None:
        raise RuntimeError("Model is not loaded.")
    return _input_size


def get_class_name(index: int) -> str:
    if index < 0 or index >= len(_class_names):
        raise RuntimeError("Predicted class index is out of range.")
    return _class_names[index]


def predict(image_batch: np.ndarray) -> np.ndarray:
    if _model is None:
        raise RuntimeError("Model is not loaded.")
    predictions = _model.predict(image_batch, verbose=0)
    if predictions.ndim != 2 or predictions.shape[0] == 0:
        raise RuntimeError("Unexpected model output shape.")
    return predictions[0]

