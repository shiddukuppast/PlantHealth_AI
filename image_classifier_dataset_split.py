import os
import random
import shutil
from pathlib import Path

# ============================================================
# CONFIGURATION
# ============================================================

# ============================================================
# ADD YOUR DATASET PATHS HERE
# ============================================================

PLANTVILLAGE_PATH = r"C:\Users\user\OneDrive - REVA University\Projects\PlantHealth_AI\Dataset\PlantVillage"

IP102_PATH = r"C:\Users\user\OneDrive - REVA University\Projects\PlantHealth_AI\PestDataset\train"


# ============================================================
# OUTPUT DATASET
# ============================================================

OUTPUT_PATH = r"C:\Users\user\OneDrive - REVA University\Projects\PlantHealth_AI\Image_Classifier"


# ============================================================
# SETTINGS
# ============================================================

MIN_IMAGES_PER_CLASS = 20000

TRAIN_RATIO = 0.80
VAL_RATIO = 0.10
TEST_RATIO = 0.10

RANDOM_SEED = 42

IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".webp"
}


# ============================================================
# CHECK SETTINGS
# ============================================================

if not PLANTVILLAGE_PATH:
    raise ValueError(
        "Please add the PlantVillage dataset path."
    )

if not IP102_PATH:
    raise ValueError(
        "Please add the IP102 dataset path."
    )

if not OUTPUT_PATH:
    raise ValueError(
        "Please add the output dataset path."
    )


random.seed(RANDOM_SEED)


# ============================================================
# FIND ALL IMAGES RECURSIVELY
# ============================================================

def find_images(dataset_path):

    dataset_path = Path(dataset_path)

    images = []

    for file in dataset_path.rglob("*"):

        if file.is_file():

            if file.suffix.lower() in IMAGE_EXTENSIONS:
                images.append(file)

    return images


# ============================================================
# FIND PLANTVILLAGE IMAGES
# ============================================================

print("=" * 70)
print("SEARCHING PLANTVILLAGE")
print("=" * 70)

disease_images = find_images(
    PLANTVILLAGE_PATH
)

print(
    f"PlantVillage images found: "
    f"{len(disease_images):,}"
)


# ============================================================
# FIND IP102 IMAGES
# ============================================================

print("\n" + "=" * 70)
print("SEARCHING IP102")
print("=" * 70)

pest_images = find_images(
    IP102_PATH
)

print(
    f"IP102 images found: "
    f"{len(pest_images):,}"
)


# ============================================================
# CHECK MINIMUM
# ============================================================

print("\n" + "=" * 70)
print("DATASET CHECK")
print("=" * 70)

if len(disease_images) < MIN_IMAGES_PER_CLASS:

    raise ValueError(
        f"PlantVillage contains only "
        f"{len(disease_images):,} images.\n"
        f"Required: {MIN_IMAGES_PER_CLASS:,}"
    )


if len(pest_images) < MIN_IMAGES_PER_CLASS:

    raise ValueError(
        f"IP102 contains only "
        f"{len(pest_images):,} images.\n"
        f"Required: {MIN_IMAGES_PER_CLASS:,}"
    )


print(
    f"✅ Disease images available: "
    f"{len(disease_images):,}"
)

print(
    f"✅ Pest images available: "
    f"{len(pest_images):,}"
)


# ============================================================
# SHUFFLE
# ============================================================

random.shuffle(disease_images)
random.shuffle(pest_images)


# ============================================================
# TAKE EXACTLY 20,000 FROM EACH CLASS
# ============================================================

disease_images = disease_images[
    :MIN_IMAGES_PER_CLASS
]

pest_images = pest_images[
    :MIN_IMAGES_PER_CLASS
]


print("\nSelected images:")
print(
    f"Disease: {len(disease_images):,}"
)
print(
    f"Pest   : {len(pest_images):,}"
)


# ============================================================
# SPLIT FUNCTION
# ============================================================

def split_images(images):

    total = len(images)

    train_end = int(
        total * TRAIN_RATIO
    )

    val_end = train_end + int(
        total * VAL_RATIO
    )

    train_images = images[:train_end]

    val_images = images[
        train_end:val_end
    ]

    test_images = images[
        val_end:
    ]

    return (
        train_images,
        val_images,
        test_images
    )


# ============================================================
# SPLIT DISEASE
# ============================================================

(
    disease_train,
    disease_val,
    disease_test
) = split_images(
    disease_images
)


# ============================================================
# SPLIT PEST
# ============================================================

(
    pest_train,
    pest_val,
    pest_test
) = split_images(
    pest_images
)


# ============================================================
# PRINT SPLIT COUNTS
# ============================================================

print("\n" + "=" * 70)
print("SPLIT INFORMATION")
print("=" * 70)

print("\nDisease:")
print(
    f"Train      : {len(disease_train):,}"
)
print(
    f"Validation : {len(disease_val):,}"
)
print(
    f"Test       : {len(disease_test):,}"
)

print("\nPest:")
print(
    f"Train      : {len(pest_train):,}"
)
print(
    f"Validation : {len(pest_val):,}"
)
print(
    f"Test       : {len(pest_test):,}"
)


# ============================================================
# CREATE DIRECTORIES
# ============================================================

folders = [
    "train",
    "validation",
    "test"
]

classes = [
    "Disease",
    "Pest"
]

for folder in folders:

    for class_name in classes:

        folder_path = os.path.join(
            OUTPUT_PATH,
            folder,
            class_name
        )

        os.makedirs(
            folder_path,
            exist_ok=True
        )


# ============================================================
# COPY FUNCTION
# ============================================================

def copy_images(
    images,
    destination,
    prefix
):

    total = len(images)

    print(
        f"\nCopying {prefix}: "
        f"{total:,} images"
    )

    for index, source in enumerate(images):

        source = Path(source)

        # Create unique filename
        destination_file = os.path.join(
            destination,
            f"{prefix}_{index:06d}_{source.name}"
        )

        shutil.copy2(
            source,
            destination_file
        )

        if (index + 1) % 1000 == 0:

            print(
                f"  {index + 1:,}/{total:,}"
            )

    print(
        f"✅ Finished {prefix}"
    )


# ============================================================
# COPY DISEASE TRAIN
# ============================================================

copy_images(
    disease_train,
    os.path.join(
        OUTPUT_PATH,
        "train",
        "Disease"
    ),
    "disease_train"
)


# ============================================================
# COPY DISEASE VALIDATION
# ============================================================

copy_images(
    disease_val,
    os.path.join(
        OUTPUT_PATH,
        "validation",
        "Disease"
    ),
    "disease_val"
)


# ============================================================
# COPY DISEASE TEST
# ============================================================

copy_images(
    disease_test,
    os.path.join(
        OUTPUT_PATH,
        "test",
        "Disease"
    ),
    "disease_test"
)


# ============================================================
# COPY PEST TRAIN
# ============================================================

copy_images(
    pest_train,
    os.path.join(
        OUTPUT_PATH,
        "train",
        "Pest"
    ),
    "pest_train"
)


# ============================================================
# COPY PEST VALIDATION
# ============================================================

copy_images(
    pest_val,
    os.path.join(
        OUTPUT_PATH,
        "validation",
        "Pest"
    ),
    "pest_val"
)


# ============================================================
# COPY PEST TEST
# ============================================================

copy_images(
    pest_test,
    os.path.join(
        OUTPUT_PATH,
        "test",
        "Pest"
    ),
    "pest_test"
)


# ============================================================
# FINAL VERIFICATION
# ============================================================

print("\n" + "=" * 70)
print("FINAL DATASET")
print("=" * 70)


def count_images(folder):

    if not os.path.exists(folder):
        return 0

    return sum(
        1
        for file in Path(folder).rglob("*")
        if file.is_file()
        and file.suffix.lower()
        in IMAGE_EXTENSIONS
    )


for split in [
    "train",
    "validation",
    "test"
]:

    print(f"\n{split.upper()}")

    for class_name in [
        "Disease",
        "Pest"
    ]:

        folder = os.path.join(
            OUTPUT_PATH,
            split,
            class_name
        )

        count = count_images(folder)

        print(
            f"{class_name:10s}: "
            f"{count:,}"
        )


print("\n" + "=" * 70)
print("✅ BINARY DATASET CREATION COMPLETE")
print("=" * 70)

print(
    "\nDataset location:"
)

print(OUTPUT_PATH)