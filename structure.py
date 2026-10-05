import os

# Folders we don't want to scan
EXCLUDED_DIRS = {
    "node_modules",
    "Dataset",
    "Image_Classifier",
    "PestDataset",
    "PlantVillage",
    ".git",
    "__pycache__",
    ".next",
    "venv",
    ".venv",
    "env",
    ".env",
}

def print_tree(root, prefix=""):
    try:
        items = sorted(
            os.listdir(root),
            key=lambda x: (not os.path.isdir(os.path.join(root, x)), x.lower())
        )
    except PermissionError:
        return

    items = [
        item for item in items
        if item not in EXCLUDED_DIRS
        and not item.startswith(".")
    ]

    for index, item in enumerate(items):
        path = os.path.join(root, item)

        is_last = index == len(items) - 1
        connector = "└── " if is_last else "├── "

        print(prefix + connector + item)

        if os.path.isdir(path):
            extension = "    " if is_last else "│   "
            print_tree(path, prefix + extension)


# Current folder
root = os.getcwd()

print(os.path.basename(root))
print_tree(root)