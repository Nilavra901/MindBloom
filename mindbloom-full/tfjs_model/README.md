# TF.js Model Weights

This folder should contain your converted model weights for full accuracy.

## How to generate these files

```bash
# From project root:
python scripts/convert_model.py
```

## Expected files after conversion
- `model.json` — model topology + weight manifest
- `group1-shard1of1.bin` — binary weight data

## Note
These files are excluded from git (.gitignore) because .bin files can be very large.
Download them from your Google Drive or regenerate using convert_model.py.
