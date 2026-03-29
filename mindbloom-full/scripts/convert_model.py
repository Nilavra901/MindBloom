"""
scripts/convert_model.py
─────────────────────────
Converts your trained Keras .h5 model → TensorFlow.js format
so it loads with full accuracy in the browser.

Usage:
    # Place facialemotionmodel.h5 in the project root, then:
    pip install tensorflowjs
    python scripts/convert_model.py

Output:
    tfjs_model/model.json  +  tfjs_model/*.bin
    → These files are automatically referenced by js/emotion.js
"""

import os
import sys
import subprocess

ROOT     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H5_FILE  = os.path.join(ROOT, "facialemotionmodel.h5")
OUT_DIR  = os.path.join(ROOT, "tfjs_model")

def check_deps():
    try:
        import tensorflowjs
        print(f"✅  tensorflowjs {tensorflowjs.__version__}")
    except ImportError:
        print("⏳  Installing tensorflowjs...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "tensorflowjs"])
        print("✅  tensorflowjs installed")

def convert():
    if not os.path.exists(H5_FILE):
        print(f"❌  {H5_FILE} not found.")
        print("    Place facialemotionmodel.h5 in the project root folder.")
        sys.exit(1)

    print(f"⏳  Converting {H5_FILE} ...")
    os.makedirs(OUT_DIR, exist_ok=True)

    result = subprocess.run([
        "tensorflowjs_converter",
        "--input_format", "keras",
        "--output_format", "tfjs_layers_model",
        H5_FILE,
        OUT_DIR
    ], capture_output=True, text=True)

    if result.returncode != 0:
        print("❌  Conversion failed:")
        print(result.stderr)
        sys.exit(1)

    files = os.listdir(OUT_DIR)
    print(f"✅  Converted! Files in tfjs_model/:")
    for f in files:
        size = os.path.getsize(os.path.join(OUT_DIR, f))
        print(f"     {f}  ({size/1024:.1f} KB)")

def patch_emotion_js():
    """Uncomment the TF.js model loader line in js/emotion.js"""
    path = os.path.join(ROOT, "js", "emotion.js")
    if not os.path.exists(path):
        return

    with open(path) as f:
        code = f.read()

    # Replace the buildCNN call with loadLayersModel
    patched = code.replace(
        "// TODO: replace with tf.loadLayersModel when tfjs_model/ is available",
        "// Model loaded from tfjs_model/ — full trained weights"
    )
    patched = patched.replace(
        "if (!cnnReady) await buildCNN();",
        "if (!cnnReady) { cnnModel = await tf.loadLayersModel('tfjs_model/model.json'); cnnReady = true; }"
    )

    with open(path, 'w') as f:
        f.write(patched)
    print("✅  js/emotion.js patched to load from tfjs_model/")

def main():
    print("=" * 50)
    print("  MindBloom — Model Converter")
    print("=" * 50)
    check_deps()
    convert()
    patch_emotion_js()
    print()
    print("=" * 50)
    print("  Next steps:")
    print("  1. Run:  python -m http.server 8000")
    print("  2. Open: http://localhost:8000")
    print("  3. Go to Emotion Scan tab — full accuracy!")
    print("=" * 50)

if __name__ == "__main__":
    main()
