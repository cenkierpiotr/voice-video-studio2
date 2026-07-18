#!/usr/bin/env python3
"""Chatterbox TTS worker — persistent subprocess, JSON-lines protocol via stdin/stdout.

Protocol:
  stdin:  {"text":"...", "ref_wav":"/path.wav", "out_wav":"/out.wav", "lang":"pl"}\n
  stdout: {"ok":true}\n  or  {"ok":false,"error":"..."}\n
  First stdout line after startup: {"ready":true}

Lang routing:
  "en"  → ChatterboxTTS (Turbo, English-optimised)
  other → ChatterboxMultilingualTTS V3 with language_id=lang
"""
import sys, json, os

# resemble-perth native extension often unavailable — patch before chatterbox import
try:
    import perth
    if perth.PerthImplicitWatermarker is None:
        perth.PerthImplicitWatermarker = perth.DummyWatermarker
except Exception:
    pass

device = "cuda" if os.path.exists("/dev/nvidia0") or os.environ.get("CUDA_VISIBLE_DEVICES", "") != "" else "cpu"

_en_model = None
_ml_model = None


def get_en_model():
    global _en_model
    if _en_model is None:
        from chatterbox.tts import ChatterboxTTS
        _en_model = ChatterboxTTS.from_pretrained(device=device)
    return _en_model


def get_ml_model():
    global _ml_model
    if _ml_model is None:
        from chatterbox.mtl_tts import ChatterboxMultilingualTTS
        _ml_model = ChatterboxMultilingualTTS.from_pretrained(device=device)
    return _ml_model


print(json.dumps({"ready": True}), flush=True)

for raw_line in sys.stdin:
    raw_line = raw_line.strip()
    if not raw_line:
        continue
    try:
        req = json.loads(raw_line)
        text = req["text"]
        ref_wav = req.get("ref_wav")
        out_wav = req["out_wav"]
        lang = req.get("lang", "pl")

        import torchaudio as ta

        if lang == "en":
            model = get_en_model()
            kwargs = {"exaggeration": 0.4}
            if ref_wav and os.path.exists(ref_wav):
                kwargs["audio_prompt_path"] = ref_wav
            wav = model.generate(text, **kwargs)
            sr = model.sr
        else:
            model = get_ml_model()
            kwargs = {"language_id": lang, "exaggeration": 0.4}
            if ref_wav and os.path.exists(ref_wav):
                kwargs["audio_prompt_path"] = ref_wav
            wav = model.generate(text, **kwargs)
            sr = model.sr

        ta.save(out_wav, wav, sr)
        print(json.dumps({"ok": True}), flush=True)
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}), flush=True)
