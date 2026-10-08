"""
Speaks the dance counts with espeak-ng, one WAV per word, into
audio-sources/voice/<locale>/. These are placeholders: a real person
counting sounds far better — record each word as a WAV with the same name
and drop it in place of the generated one. Then run `npm run samples`.

Usage:
  python3 -m venv .venv && .venv/bin/pip install espeakng-loader
  .venv/bin/python scripts/speak-counts.py

espeak-ng is GPL software; the audio it produces is not covered by that
license and may be used freely.
"""
import ctypes
import os
import wave

import espeakng_loader

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

# File name → word, per locale. Must match VOICE_WORDS in app/genres/voice.ts.
WORDS = {
    'en': {'1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
           '6': 'six', '7': 'seven', '8': 'eight', 'and': 'and'},
    'ru': {'1': 'раз', '2': 'два', '3': 'три', '4': 'четыре', '5': 'пять',
           '6': 'шесть', '7': 'семь', '8': 'восемь',
           # Written as a phoneme: spelled «и», espeak-ng swallows it to ~30 ms.
           'and': '[[i]]'},
}
VOICES = {'en': 'en-us', 'ru': 'ru'}
# Words per minute: brisk, so a word fits in a count at dance tempos.
RATE = 230

AUDIO_OUTPUT_SYNCHRONOUS = 2
ESPEAK_RATE = 1
POS_CHARACTER = 1
CHARS_UTF8 = 1

lib = ctypes.CDLL(espeakng_loader.get_library_path())
data_dir = os.path.dirname(espeakng_loader.get_data_path())
sample_rate = lib.espeak_Initialize(AUDIO_OUTPUT_SYNCHRONOUS, 0, data_dir.encode(), 0)
if sample_rate <= 0:
    raise SystemExit('espeak-ng failed to initialize')

chunks: list[bytes] = []
CALLBACK = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.c_void_p)


@CALLBACK
def collect(wav, count, _events):
    if wav and count > 0:
        chunks.append(ctypes.string_at(wav, count * 2))
    return 0


lib.espeak_SetSynthCallback(collect)
lib.espeak_SetParameter(ESPEAK_RATE, RATE, 0)

for locale, words in WORDS.items():
    if lib.espeak_SetVoiceByName(VOICES[locale].encode()) != 0:
        raise SystemExit(f'espeak-ng has no voice {VOICES[locale]}')
    out_dir = os.path.join(ROOT, 'audio-sources', 'voice', locale)
    os.makedirs(out_dir, exist_ok=True)
    for name, word in words.items():
        chunks.clear()
        text = word.encode()
        lib.espeak_Synth(text, len(text) + 1, 0, POS_CHARACTER, 0, CHARS_UTF8, None, None)
        lib.espeak_Synchronize()
        path = os.path.join(out_dir, f'{name}.wav')
        with wave.open(path, 'wb') as out:
            out.setnchannels(1)
            out.setsampwidth(2)
            out.setframerate(sample_rate)
            out.writeframes(b''.join(chunks))
        print(f'{path}  {word}')
