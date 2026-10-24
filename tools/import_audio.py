"""把 tts/audio/*.pcm（24 kHz 单声道 16 位）转成 assets/audio/<段名>.mp3，并写 data/audio.json（文件名与时长）。
用法：python3 tools/import_audio.py [pcm 目录，默认 tts/audio]
需要 ffmpeg / ffprobe 与 numpy。处理：首尾静音裁到约 0.1 秒（页面上的「停半秒」才准）；
句间超过 MAX_PAUSE 的长停顿压到 MAX_PAUSE；整体加速 TEMPO（保持音高）。"""
MAX_PAUSE = 0.35
TEMPO = 1.2
import os, sys, json, glob, subprocess, re, tempfile
import numpy as np
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'tts/audio')
ids = [s['id'] for s in json.load(open(os.path.join(root, 'tts/script.json')))]
out_dir = os.path.join(root, 'assets/audio'); os.makedirs(out_dir, exist_ok=True)
for f in glob.glob(os.path.join(out_dir, '*.mp3')): os.remove(f)  # 清掉旧配音
man = {}; missing = []
for i in ids:
    fs = sorted(glob.glob(os.path.join(src, f'{i}_*.pcm')), key=os.path.getmtime)
    fs = [f for f in fs if re.fullmatch(re.escape(i) + r'_[0-9a-f]{10}\.pcm', os.path.basename(f))]
    if not fs: missing.append(i); continue
    out = os.path.join(out_dir, f'{i}.mp3')
    x = np.fromfile(fs[-1], dtype='<i2').astype(np.float32); sr = 24000; w = 480
    n = len(x) // w; e = 20 * np.log10(np.sqrt((x[:n * w].reshape(n, w) ** 2).mean(1)) / 32768 + 1e-9); sil = e < -40
    voiced = np.where(~sil)[0]
    a0, a1 = (max(0, voiced[0] - 5), min(n, voiced[-1] + 6)) if len(voiced) else (0, n)
    keep = []; k = a0; mp = int(MAX_PAUSE / .02)
    while k < a1:
        if sil[k]:
            j = k
            while j < a1 and sil[j]: j += 1
            L = j - k
            if L > mp: keep.append((k * w, (k + mp // 2) * w)); keep.append(((j - mp // 2) * w, j * w))
            else: keep.append((k * w, j * w))
            k = j
        else:
            j = k
            while j < a1 and not sil[j]: j += 1
            keep.append((k * w, j * w)); k = j
    y = np.concatenate([x[p:q] for p, q in keep]).astype('<i2')
    tmp = tempfile.NamedTemporaryFile(suffix='.pcm', delete=False); y.tofile(tmp.name); tmp.close()
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', tmp.name, '-af', f'atempo={TEMPO}', '-c:a', 'libmp3lame', '-b:a', '64k', out], check=True)
    os.remove(tmp.name)
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip())
    man[i] = {'f': f'{i}.mp3', 'd': round(d, 3)}
json.dump(man, open(os.path.join(root, 'data/audio.json'), 'w'), ensure_ascii=False, indent=0)
tot = sum(v['d'] for v in man.values())
print(f'{len(man)} 段，配音共 {tot/60:.1f} 分钟；加上每页前后各半秒与过渡，成片约 {(tot + len(man)*1.4)/60:.1f} 分钟')
if missing: print('缺少：', ' '.join(missing))
