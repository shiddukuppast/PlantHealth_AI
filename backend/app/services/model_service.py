import json
from pathlib import Path

import numpy as np
from tensorflow.keras.models import Model, load_model

from app.core.config import get_settings


# ============================================================
# MODEL STORAGE
# ============================================================

_classifier_model: Model | None = None
_disease_model: Model | None = None
_pest_model: Model | None = None


_classifier_input_size: tuple[int, int] | None = None
_disease_input_size: tuple[int, int] | None = None
_pest_input_size: tuple[int, int] | None = None


_classifier_class_names: list[str] = []
_disease_class_names: list[str] = []
_pest_class_names: list[str] = []


# ============================================================
# LOAD CLASS NAMES
# ============================================================

def _load_class_names(
    class_file: Path,
    expected_classes: int | None = None,
) -> list[str]:

    if not class_file.exists():
        raise RuntimeError(
            f"Class names file not found at: {class_file}"
        )

    try:
        contents = class_file.read_text(encoding="utf-8")
        if class_file.suffix.lower() == ".txt":
            loaded = [
                line.split(maxsplit=1)[1].strip()
                if len(line.split(maxsplit=1)) == 2
                and line.split(maxsplit=1)[0].isdigit()
                else line.strip()
                for line in contents.splitlines()
                if line.strip()
            ]
        else:
            loaded = json.loads(contents)
    except Exception as exc:
        raise RuntimeError(
            f"Unable to read class names file: {class_file}"
        ) from exc

    if (
        not isinstance(loaded, list)
        or not all(
            isinstance(item, str)
            for item in loaded
        )
    ):
        raise RuntimeError(
            f"Class names file must contain "
            f"a JSON array of strings: {class_file}"
        )

    if expected_classes is not None:

        if len(loaded) != expected_classes:

            raise RuntimeError(
                f"Class mapping mismatch for "
                f"{class_file}.\n"
                f"Model outputs {expected_classes} classes, "
                f"but mapping contains {len(loaded)}."
            )

    return loaded


# ============================================================
# GET MODEL INPUT SIZE
# ============================================================

def _get_input_size(
    model: Model,
) -> tuple[int, int]:

    input_shape = model.input_shape

    if isinstance(input_shape, list):
        input_shape = input_shape[0]

    if (
        len(input_shape) < 3
        or input_shape[1] is None
        or input_shape[2] is None
    ):
        raise RuntimeError(
            "Unable to determine model image input size "
            f"from shape: {input_shape}"
        )

    return (
        int(input_shape[1]),
        int(input_shape[2])
    )


# ============================================================
# GET NUMBER OF OUTPUT CLASSES
# ============================================================

def _get_output_classes(
    model: Model,
) -> int:

    output_shape = model.output_shape

    if isinstance(output_shape, list):
        output_shape = output_shape[0]

    if (
        output_shape is None
        or output_shape[-1] is None
    ):
        raise RuntimeError(
            "Unable to determine number of model outputs."
        )

    return int(output_shape[-1])


# ============================================================
# LOAD MODEL 1
# DISEASE VS PEST
# ============================================================

def _load_classifier_model() -> None:

    global _classifier_model
    global _classifier_input_size
    global _classifier_class_names

    settings = get_settings()

    model_path = settings.classifier_model_file

    if not model_path.exists():

        raise RuntimeError(
            f"Classifier model not found at: "
            f"{model_path}"
        )

    print(
        f"Loading Disease/Pest classifier: "
        f"{model_path}"
    )

    model = load_model(model_path, compile=False)

    output_classes = _get_output_classes(model)

    class_names = _load_class_names(
        settings.classifier_class_names_file,
        output_classes
    )

    _classifier_input_size = _get_input_size(model)

    _classifier_class_names = class_names

    _classifier_model = model

    print(
        "Disease/Pest classifier loaded successfully."
    )

    print(
        f"Input size: {_classifier_input_size}"
    )

    print(
        f"Classes: {_classifier_class_names}"
    )


# ============================================================
# LOAD MODEL 2
# PLANT DISEASE
# ============================================================

def _load_disease_model() -> None:

    global _disease_model
    global _disease_input_size
    global _disease_class_names

    settings = get_settings()

    model_path = settings.disease_model_file

    if not model_path.exists():

        raise RuntimeError(
            f"Disease model not found at: "
            f"{model_path}"
        )

    print(
        f"Loading disease model: {model_path}"
    )

    model = load_model(model_path, compile=False)

    output_classes = _get_output_classes(model)

    class_names = _load_class_names(
        settings.disease_class_names_file,
        output_classes
    )

    _disease_input_size = _get_input_size(model)

    _disease_class_names = class_names

    _disease_model = model

    print(
        "Disease model loaded successfully."
    )

    print(
        f"Input size: {_disease_input_size}"
    )

    print(
        f"Number of classes: {len(_disease_class_names)}"
    )


# ============================================================
# LOAD MODEL 3
# PEST
# ============================================================

def _load_pest_model() -> None:

    global _pest_model
    global _pest_input_size
    global _pest_class_names

    settings = get_settings()

    model_path = settings.pest_model_file

    if not model_path.exists():

        raise RuntimeError(
            f"Pest model not found at: "
            f"{model_path}"
        )

    print(
        f"Loading pest model: {model_path}"
    )

    model = load_model(model_path, compile=False)

    output_classes = _get_output_classes(model)

    class_names = _load_class_names(
        settings.pest_class_names_file,
        output_classes
    )

    _pest_input_size = _get_input_size(model)

    _pest_class_names = class_names

    _pest_model = model

    print(
        "Pest model loaded successfully."
    )

    print(
        f"Input size: {_pest_input_size}"
    )

    print(
        f"Number of classes: {len(_pest_class_names)}"
    )


# ============================================================
# LOAD ALL MODELS
# ============================================================

def load_models_once() -> None:

    global _classifier_model
    global _disease_model
    global _pest_model

    # Prevent loading again
    if (
        _classifier_model is not None
        and _disease_model is not None
        and _pest_model is not None
    ):
        return

    print("=" * 60)
    print("LOADING AI MODELS")
    print("=" * 60)

    _load_classifier_model()

    _load_disease_model()

    _load_pest_model()

    print("=" * 60)
    print("ALL AI MODELS LOADED")
    print("=" * 60)


# ============================================================
# BACKWARD COMPATIBILITY
# ============================================================

def load_model_once() -> None:
    """
    Kept so existing startup code does not immediately break.

    New code should use load_models_once().
    """

    load_models_once()


def is_loaded() -> bool:
    """Return whether all configured inference models are ready."""

    return models_loaded()


# ============================================================
# MODEL 1 INPUT SIZE
# ============================================================

def get_classifier_input_size() -> tuple[int, int]:

    if _classifier_input_size is None:

        raise RuntimeError(
            "Disease/Pest classifier is not loaded."
        )

    return _classifier_input_size


# ============================================================
# MODEL 2 INPUT SIZE
# ============================================================

def get_disease_input_size() -> tuple[int, int]:

    if _disease_input_size is None:

        raise RuntimeError(
            "Disease model is not loaded."
        )

    return _disease_input_size


# ============================================================
# MODEL 3 INPUT SIZE
# ============================================================

def get_pest_input_size() -> tuple[int, int]:

    if _pest_input_size is None:

        raise RuntimeError(
            "Pest model is not loaded."
        )

    return _pest_input_size


# ============================================================
# MODEL 1 CLASS NAME
# ============================================================

def get_classifier_class_name(
    index: int
) -> str:

    if (
        index < 0
        or index >= len(_classifier_class_names)
    ):

        raise RuntimeError(
            "Classifier predicted class index "
            "is out of range."
        )

    return _classifier_class_names[index]


# ============================================================
# MODEL 2 CLASS NAME
# ============================================================

def get_disease_class_name(
    index: int
) -> str:

    if (
        index < 0
        or index >= len(_disease_class_names)
    ):

        raise RuntimeError(
            "Disease predicted class index "
            "is out of range."
        )

    return _disease_class_names[index]


# ============================================================
# MODEL 3 CLASS NAME
# ============================================================

def get_pest_class_name(
    index: int
) -> str:

    if (
        index < 0
        or index >= len(_pest_class_names)
    ):

        raise RuntimeError(
            "Pest predicted class index "
            "is out of range."
        )

    return _pest_class_names[index]


# ============================================================
# MODEL 1 PREDICTION
# ============================================================

def predict_classifier(
    image_batch: np.ndarray
) -> np.ndarray:

    if _classifier_model is None:

        raise RuntimeError(
            "Disease/Pest classifier is not loaded."
        )

    predictions = _classifier_model.predict(
        image_batch,
        verbose=0
    )

    if (
        predictions.ndim != 2
        or predictions.shape[0] == 0
    ):

        raise RuntimeError(
            "Unexpected classifier output shape."
        )

    return predictions[0]


# ============================================================
# MODEL 2 PREDICTION
# ============================================================

def predict_disease(
    image_batch: np.ndarray
) -> np.ndarray:

    if _disease_model is None:

        raise RuntimeError(
            "Disease model is not loaded."
        )

    predictions = _disease_model.predict(
        image_batch,
        verbose=0
    )

    if (
        predictions.ndim != 2
        or predictions.shape[0] == 0
    ):

        raise RuntimeError(
            "Unexpected disease model output shape."
        )

    return predictions[0]


# ============================================================
# MODEL 3 PREDICTION
# ============================================================

def predict_pest(
    image_batch: np.ndarray
) -> np.ndarray:

    if _pest_model is None:

        raise RuntimeError(
            "Pest model is not loaded."
        )

    predictions = _pest_model.predict(
        image_batch,
        verbose=0
    )

    if (
        predictions.ndim != 2
        or predictions.shape[0] == 0
    ):

        raise RuntimeError(
            "Unexpected pest model output shape."
        )

    return predictions[0]


# ============================================================
# STATUS
# ============================================================

def models_loaded() -> bool:

    return (
        _classifier_model is not None
        and _disease_model is not None
        and _pest_model is not None
    )