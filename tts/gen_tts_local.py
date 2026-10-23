"""为《混沌法典 · 全卷》生成配音（只用 Python 标准库，在你自己的电脑上运行）。
用法（在 tts 文件夹里）：
    python3 gen_tts_local.py /path/to/你的.env            # 生成全部 117 段
    python3 gen_tts_local.py /path/to/你的.env --sample   # 只用开场第一句试听几种低沉男声，输出到 ./samples/
    python3 gen_tts_local.py /path/to/你的.env --voice Charon   # 换声音（默认 Algenib）
.env 里需要 GEMINI_API_KEY=...（可选 GEMINI_BASE_URL=...）。密钥只在运行时读取，不会打印。
输出：./audio/<段名>_<哈希>.pcm（24 kHz 单声道 16 位）。可中断后重跑，已生成的会跳过。"""
import os, sys, json, base64, hashlib, glob, time, re, urllib.request
VOICE = 'Algenib'
MODEL = 'gemini-2.5-flash-preview-tts'
STYLE = ('用低沉、浑厚、略带沙哑与沧桑的老年男声朗读，语速缓慢从容，像一位活了上万年的修士在山中向后辈讲述往事；'
         '句读处自然停顿，不要激动，不要播音腔。只朗读下面的中文：')
SAMPLE_VOICES = ['Algenib', 'Gacrux', 'Charon', 'Orus', 'Alnilam']
def load_env(p):
    env = {}
    for line in open(os.path.expanduser(p)):
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1); env[k.strip()] = v.strip().strip('"\'')
    if not env.get('GEMINI_API_KEY'): sys.exit('env 文件里没有找到 GEMINI_API_KEY')
    return env
def endpoint(env):
    base = (env.get('GEMINI_BASE_URL') or 'https://generativelanguage.googleapis.com').rstrip('/')
    if not base.endswith('/v1beta'): base += '/v1beta'
    return f"{base}/models/{MODEL}:generateContent"
def tts(key, url, voice, text, out):
    body = {"contents": [{"parts": [{"text": STYLE + "\n" + text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": key})
    for k in range(8):
        try:
            with urllib.request.urlopen(req, timeout=240) as r: d = json.load(r)
            open(out, 'wb').write(base64.b64decode(d['candidates'][0]['content']['parts'][0]['inlineData']['data'])); return
        except Exception as e:
            print('  重试', k + 1, type(e).__name__, str(e)[:80]); time.sleep(min(60, 8 * (k + 1)))
    sys.exit('多次失败，稍后重跑即可（已完成的会跳过）')
def wav(pcm, out):
    import wave
    with wave.open(out, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(open(pcm, 'rb').read())
if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    env = load_env(a[0]); key = env['GEMINI_API_KEY']; url = endpoint(env)
    voice = a[a.index('--voice') + 1] if '--voice' in a else VOICE
    S = json.load(open('script.json'))
    if '--sample' in a:
        os.makedirs('samples', exist_ok=True); text = S[0]['beats'][0].split('。')[0] + '。' + S[0]['beats'][0].split('。')[1] + '。'
        for v in SAMPLE_VOICES:
            p = f'samples/{v}.pcm'; tts(key, url, v, text, p); wav(p, f'samples/{v}.wav'); os.remove(p); print('试听：', f'samples/{v}.wav')
        sys.exit(0)
    os.makedirs('audio', exist_ok=True); print('声音：', voice, ' 接口：', url.split('/models/')[0])
    n = sum(len(s['beats']) for s in S); done = 0
    for s in S:
        for i, t in enumerate(s['beats']):
            done += 1; h = hashlib.md5((voice + '|' + t).encode()).hexdigest()[:10]
            out = f"audio/{s['id']}_{h}.pcm"
            if os.path.exists(out): continue
            tts(key, url, voice, t, out + '.tmp'); os.rename(out + '.tmp', out)
            print(f'[{done}/{n}] {s["id"]}  {os.path.getsize(out)/48000:.1f}s', flush=True)
    print('全部完成，共', n, '段')
