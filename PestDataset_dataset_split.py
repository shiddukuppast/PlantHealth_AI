import os
import shutil
from pathlib import Path

# ============================================================
# 1. PATHS
# ============================================================

# This is the folder shown in your screenshot
SOURCE_DIR = r"C:\Users\user\OneDrive - REVA University\Projects\ip102_v1.1"

# Inside SOURCE_DIR:
# images/
# train
# val
# test

IMAGE_DIR = os.path.join(SOURCE_DIR, "images")

TRAIN_FILE = r"C:\Users\user\OneDrive - REVA University\Projects\ip102_v1.1\train.txt"
VAL_FILE   = r"C:\Users\user\OneDrive - REVA University\Projects\ip102_v1.1\val.txt"
TEST_FILE  = r"C:\Users\user\OneDrive - REVA University\Projects\ip102_v1.1\test.txt"

# classes.txt location
CLASSES_FILE = r"C:\Users\user\OneDrive - REVA University\Projects\PlantHealth_AI\classes.txt"


# ============================================================
# 2. OUTPUT DIRECTORY
# ============================================================

OUTPUT_DIR = r"C:\Users\user\OneDrive - REVA University\Projects\PlantHealth_AI\PestDataset"

TRAIN_DIR = os.path.join(OUTPUT_DIR, "train")
VAL_DIR   = os.path.join(OUTPUT_DIR, "validation")
TEST_DIR  = os.path.join(OUTPUT_DIR, "test")


# ============================================================
# 3. CHECK PATHS
# ============================================================

print("=" * 60)
print("CHECKING DATASET")
print("=" * 60)

paths_to_check = {
    "SOURCE_DIR": SOURCE_DIR,
    "IMAGE_DIR": IMAGE_DIR,
    "TRAIN_FILE": TRAIN_FILE,
    "VAL_FILE": VAL_FILE,
    "TEST_FILE": TEST_FILE,
    "CLASSES_FILE": CLASSES_FILE
}

for name, path in paths_to_check.items():

    if os.path.exists(path):
        print(f"✅ {name}: {path}")
    else:
        print(f"❌ {name} NOT FOUND: {path}")


# Stop if important files are missing
if not os.path.exists(IMAGE_DIR):
    raise FileNotFoundError(
        f"Images folder not found:\n{IMAGE_DIR}"
    )

if not os.path.exists(TRAIN_FILE):
    raise FileNotFoundError(
        f"Train file not found:\n{TRAIN_FILE}"
    )

if not os.path.exists(VAL_FILE):
    raise FileNotFoundError(
        f"Validation file not found:\n{VAL_FILE}"
    )

if not os.path.exists(TEST_FILE):
    raise FileNotFoundError(
        f"Test file not found:\n{TEST_FILE}"
    )

if not os.path.exists(CLASSES_FILE):
    raise FileNotFoundError(
        f"classes.txt not found:\n{CLASSES_FILE}"
    )


# ============================================================
# 4. READ CLASSES.TXT
# ============================================================

print("\n" + "=" * 60)
print("READING CLASSES")
print("=" * 60)

class_names = []

with open(CLASSES_FILE, "r", encoding="utf-8") as f:

    for line in f:

        line = line.strip()

        if not line:
            continue

        # Handle either:
        # Adristyrannus
        #
        # OR
        # 0 Adristyrannus

        parts = line.split(maxsplit=1)

        if len(parts) == 2 and parts[0].isdigit():
            class_name = parts[1]
        else:
            class_name = line

        class_names.append(class_name)


print(f"Number of classes: {len(class_names)}")

for i, class_name in enumerate(class_names):
    print(f"{i:3d} | {class_name}")


# ============================================================
# 5. CREATE OUTPUT DIRECTORIES
# ============================================================

print("\n" + "=" * 60)
print("CREATING CLASS FOLDERS")
print("=" * 60)

for class_name in class_names:

    os.makedirs(
        os.path.join(TRAIN_DIR, class_name),
        exist_ok=True
    )

    os.makedirs(
        os.path.join(VAL_DIR, class_name),
        exist_ok=True
    )

    os.makedirs(
        os.path.join(TEST_DIR, class_name),
        exist_ok=True
    )

print("✅ All class folders created.")


# ============================================================
# 6. READ SPLIT FILE
# ============================================================

def read_split_file(split_file):

    records = []

    with open(split_file, "r", encoding="utf-8") as f:

        for line_number, line in enumerate(f, start=1):

            line = line.strip()

            if not line:
                continue

            parts = line.split()

            if len(parts) < 2:
                print(
                    f"⚠️ Invalid line {line_number}: {line}"
                )
                continue

            image_name = parts[0]

            try:
                class_id = int(parts[1])
            except ValueError:
                print(
                    f"⚠️ Invalid class ID at line "
                    f"{line_number}: {line}"
                )
                continue

            records.append(
                (image_name, class_id)
            )

    return records


# ============================================================
# 7. COPY IMAGES INTO CLASS FOLDERS
# ============================================================

def organize_split(
    split_file,
    destination_dir,
    split_name
):

    print("\n" + "=" * 60)
    print(f"PROCESSING {split_name}")
    print("=" * 60)

    records = read_split_file(split_file)

    print(
        f"Images listed in {split_name}: "
        f"{len(records)}"
    )

    copied = 0
    missing = 0
    invalid_class = 0

    for image_name, class_id in records:

        # ----------------------------------------------------
        # Check class ID
        # ----------------------------------------------------

        if class_id < 0 or class_id >= len(class_names):

            print(
                f"⚠️ Invalid class ID {class_id} "
                f"for {image_name}"
            )

            invalid_class += 1
            continue


        # ----------------------------------------------------
        # Get class name
        # ----------------------------------------------------

        class_name = class_names[class_id]


        # ----------------------------------------------------
        # Source image
        # ----------------------------------------------------

        source_image = os.path.join(
            IMAGE_DIR,
            image_name
        )


        # ----------------------------------------------------
        # Destination class folder
        # ----------------------------------------------------

        destination_class_folder = os.path.join(
            destination_dir,
            class_name
        )

        os.makedirs(
            destination_class_folder,
            exist_ok=True
        )


        # ----------------------------------------------------
        # Destination image
        # ----------------------------------------------------

        destination_image = os.path.join(
            destination_class_folder,
            os.path.basename(image_name)
        )


        # ----------------------------------------------------
        # Check image exists
        # ----------------------------------------------------

        if not os.path.exists(source_image):

            print(
                f"⚠️ Missing image: {image_name}"
            )

            missing += 1
            continue


        # ----------------------------------------------------
        # Copy image
        # ----------------------------------------------------

        shutil.copy2(
            source_image,
            destination_image
        )

        copied += 1


        # ----------------------------------------------------
        # Progress
        # ----------------------------------------------------

        if copied % 1000 == 0:

            print(
                f"   {copied} images copied..."
            )


    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print("\n" + "-" * 60)
    print(f"{split_name} COMPLETE")
    print("-" * 60)

    print(f"Listed images   : {len(records)}")
    print(f"Copied images   : {copied}")
    print(f"Missing images  : {missing}")
    print(f"Invalid classes : {invalid_class}")

    return copied


# ============================================================
# 8. PROCESS TRAIN
# ============================================================

train_count = organize_split(
    TRAIN_FILE,
    TRAIN_DIR,
    "TRAIN"
)


# ============================================================
# 9. PROCESS VALIDATION
# ============================================================

val_count = organize_split(
    VAL_FILE,
    VAL_DIR,
    "VALIDATION"
)


# ============================================================
# 10. PROCESS TEST
# ============================================================

test_count = organize_split(
    TEST_FILE,
    TEST_DIR,
    "TEST"
)


# ============================================================
# 11. FINAL SUMMARY
# ============================================================

print("\n")
print("=" * 60)
print("FINAL DATASET SUMMARY")
print("=" * 60)

print(f"Train images      : {train_count}")
print(f"Validation images : {val_count}")
print(f"Test images       : {test_count}")

print(
    f"Total images      : "
    f"{train_count + val_count + test_count}"
)

print(f"Number of classes : {len(class_names)}")

print("\nOutput directory:")
print(OUTPUT_DIR)

print("\n✅ DATASET ORGANIZATION COMPLETE!")