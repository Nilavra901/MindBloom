# CNN Emotion Detection Model

## Training

- **Dataset**: FER-2013 (Facial Expression Recognition)
- **Classes**: 7 — angry, disgust, fear, happy, neutral, sad, surprise
- **Training images**: 28,821
- **Test images**: 7,066
- **Framework**: TensorFlow / Keras 2.10.0
- **Epochs**: 100, Batch size: 128
- **Optimizer**: Adam
- **Loss**: categorical_crossentropy

## Files
| File | Description |
|------|-------------|
| `facialemotionmodel.json` | Model architecture (JSON) |
| `facialemotionmodel.h5` | Full model + trained weights |
| `emotiondetector.json` | Alternative saved model |
| `emotiondetector.h5` | Alternative weights |

## Colab Notebook
Training notebook: https://colab.research.google.com/drive/1LJ4nvY-KJkp0lWAAc2Yeh-4AvLVRRDBe

## Converting for Browser Use
```bash
pip install tensorflowjs
python scripts/convert_model.py
```
This generates `tfjs_model/` which the browser loads automatically.
