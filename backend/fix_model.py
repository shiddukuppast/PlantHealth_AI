import h5py

input_path = "Models/plant_disease_model.h5"
output_path = "Models/plant_disease_model_fixed.h5"

with h5py.File(input_path, "r") as source:
    model_config = source.attrs.get("model_config")

    if isinstance(model_config, bytes):
        model_config = model_config.decode("utf-8")

    if model_config is None:
        raise RuntimeError("No model_config found in H5 file.")

    print("groups=1 occurrences:", model_config.count('"groups": 1'))

# Create a copy first
with h5py.File(input_path, "r") as source, h5py.File(output_path, "w") as target:
    # Copy everything
    for key in source.keys():
        source.copy(key, target)

    # Copy root attributes
    for key, value in source.attrs.items():
        target.attrs[key] = value

    # Modify model config
    model_config = target.attrs["model_config"]

    if isinstance(model_config, bytes):
        model_config = model_config.decode("utf-8")

    model_config = model_config.replace('"groups": 1,', '')

    target.attrs.modify("model_config", model_config)

print("Fixed model created:")
print(output_path)