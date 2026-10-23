"""把 tts/audio/*.pcm（24 kHz 单声道 16 位）转成 assets/audio/<段名>.m4a，并写 data/audio.json（文件名与时长）。
用法：python3 tools/import_audio.py [pcm 目录，默认 tts/audio]
需要 ffmpeg / ffprobe。首尾静音会裁到约 0.1 秒，这样页面上的「停半秒」才准。"""
import os, sys, json, glob, subprocess, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'tts/audio')
ids = [s['id'] for s in json.load(open(os.path.join(root, 'tts/script.json')))]
out_dir = os.path.join(root, 'assets/audio'); os.makedirs(out_dir, exist_ok=True)
man = {}; missing = []
for i in ids:
    fs = sorted(glob.glob(os.path.join(src, f'{i}_*.pcm')), key=os.path.getmtime)
    fs = [f for f in fs if re.fullmatch(re.escape(i) + r'_[0-9a-f]{10}\.pcm', os.path.basename(f))]
    if not fs: missing.append(i); continue
    out = os.path.join(out_dir, f'{i}.m4a')
    af = 'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.1,areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.1,areverse'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', fs[-1], '-af', af, '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', out], check=True)
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip())
    man[i] = {'f': f'{i}.m4a', 'd': round(d, 3)}
json.dump(man, open(os.path.join(root, 'data/audio.json'), 'w'), ensure_ascii=False, indent=0)
tot = sum(v['d'] for v in man.values())
print(f'{len(man)} 段，配音共 {tot/60:.1f} 分钟；加上每页前后各半秒与过渡，成片约 {(tot + len(man)*1.4)/60:.1f} 分钟')
if missing: print('缺少：', ' '.join(missing))
