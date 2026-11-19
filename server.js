const express = require('express');
const multer = require('multer');
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 30 } });

const page = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Roblox Animation Uploader PRO</title><style>
*{box-sizing:border-box}body{margin:0;background:#0c1220;color:#f4f6ff;font:15px system-ui,Arial;padding:22px 14px}main{max-width:540px;margin:auto}.card{background:#171f30;border:1px solid #2c3950;border-radius:18px;padding:20px}h1{font-size:23px;margin:0 0 5px}p,.muted{color:#aab6ca;line-height:1.5}label{display:block;margin:17px 0 7px;font-weight:650}input{width:100%;padding:13px;border:1px solid #394962;border-radius:10px;background:#0e1727;color:white;font-size:15px}input[type=file]{padding:10px}button{margin-top:17px;width:100%;padding:14px;border:0;border-radius:10px;background:#527cff;color:white;font-weight:700;font-size:16px}button:disabled{opacity:.55}.status{white-space:pre-wrap;line-height:1.55;margin-top:15px}.note{font-size:12px;color:#9baac1;margin-top:15px}.good{color:#72e6a2}.bad{color:#ff9999}.item{padding:12px 0;border-bottom:1px solid #2b3547}a{color:#9bb8ff}
</style></head><body><main><div class="card"><h1>Roblox Animation Uploader PRO</h1><p>Verifikasi username, lalu upload banyak file sekaligus. Nama asset otomatis dari nama file.</p>
<label>Roblox Open Cloud API Key</label><input id="key" type="password" autocomplete="off" placeholder="Masukkan API Key">
<label>Username Roblox</label><input id="username" placeholder="Contoh: RobloxPlayer123">
<button id="verify">Verifikasi akun</button><div id="verified" class="status"></div>
<div id="uploadArea" hidden><label>Pilih file (.rbxm / .rbxmx)</label><input id="files" type="file" accept=".rbxm,.rbxmx" multiple><div class="muted" style="font-size:12px">Maksimal 30 file, 20 MB per file.</div><button id="upload">Upload semua file</button></div><div id="results" class="status"></div>
<div class="note">API Key dipakai sementara untuk request upload dan tidak disimpan. Jangan bagikan API Key. Pastikan API Key memiliki izin Assets yang sesuai untuk akunmu.</div></div></main>
<script>
const $=id=>document.getElementById(id);let userId='';
$('verify').onclick=async()=>{const username=$('username').value.trim();$('verified').textContent='Memeriksa username...';$('uploadArea').hidden=true;if(!username)return $('verified').textContent='Masukkan username dulu.';try{const r=await fetch('/api/resolve-user',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username})});const j=await r.json();if(!r.ok)throw Error(j.error||'Gagal memeriksa username');userId=String(j.userId);$('verified').innerHTML='<span class="good">Username ditemukan. User ID: '+userId+'</span>';if(!$('key').value.trim())$('verified').innerHTML+='<br><span class="bad">Masukkan API Key sebelum upload.</span>';$('uploadArea').hidden=false;}catch(e){$('verified').innerHTML='<span class="bad">'+esc(e.message)+'</span>';}};
$('upload').onclick=async()=>{const files=[...$('files').files],key=$('key').value.trim();if(!key)return $('results').textContent='Masukkan API Key dulu.';if(!files.length)return $('results').textContent='Pilih file dulu.';$('upload').disabled=true;const out=[];$('results').textContent='Mengunggah file satu per satu...';for(const f of files){try{const fd=new FormData();fd.append('apiKey',key);fd.append('userId',userId);fd.append('file',f);const r=await fetch('/api/upload-one',{method:'POST',body:fd});const j=await r.json();if(!r.ok)throw Error(j.error||'Upload gagal');out.push('<div class="item"><span class="good">BERHASIL</span> — '+esc(f.name)+'<br>Animation ID: <b>'+esc(j.assetId)+'</b><br><a target="_blank" rel="noopener" href="https://www.roblox.com/library/'+encodeURIComponent(j.assetId)+'">Buka asset</a></div>');}catch(e){out.push('<div class="item"><span class="bad">GAGAL</span> — '+esc(f.name)+'<br>'+esc(e.message)+'</div>');}$('results').innerHTML=out.join('');}$('upload').disabled=false;};
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
</script></body></html>`;

app.get('/', (req, res) => res.type('html').send(page));
app.use(express.json());
app.post('/api/resolve-user', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    if (!username) return res.status(400).json({ error: 'Username wajib diisi.' });
    const r = await fetch('https://users.roblox.com/v1/usernames/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usernames: [username], excludeBannedUsers: false }) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data.errors?.[0]?.message || 'Roblox gagal mencari username.' });
    if (!data.data?.length) return res.status(404).json({ error: 'Username Roblox tidak ditemukan.' });
    res.json({ userId: data.data[0].id, name: data.data[0].name });
  } catch (e) { res.status(502).json({ error: 'Gagal terhubung ke Roblox: ' + e.message }); }
});

app.post('/api/upload-one', upload.single('file'), async (req, res) => {
  try {
    const apiKey = String(req.body.apiKey || '').trim();
    const userId = String(req.body.userId || '').trim();
    const file = req.file;
    if (!apiKey || !userId || !file) return res.status(400).json({ error: 'API Key, akun, atau file belum lengkap.' });
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (!['rbxm', 'rbxmx'].includes(ext)) return res.status(400).json({ error: 'Format file harus .rbxm atau .rbxmx.' });
    const assetName = file.originalname.replace(/\.[^.]+$/, '').slice(0, 50) || 'Animation';
    const form = new FormData();
    form.append('request', JSON.stringify({ assetType: 'Animation', displayName: assetName, description: assetName, creationContext: { creator: { userId: Number(userId) } } }));
    form.append('fileContent', new Blob([file.buffer], { type: 'model/x-rbxm' }), file.originalname);
    const r = await fetch('https://apis.roblox.com/assets/v1/assets', { method: 'POST', headers: { 'x-api-key': apiKey }, body: form });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: data.message || data.error || `Roblox menolak upload (HTTP ${r.status}).` });
    const operationId = String(data.path || '').split('/').pop();
    if (!operationId) { if (data.assetId) return res.json({ assetId: String(data.assetId) }); return res.status(502).json({ error: 'Roblox tidak mengembalikan Operation ID.' }); }
    for (let i = 0; i < 45; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const sr = await fetch(`https://apis.roblox.com/assets/v1/operations/${encodeURIComponent(operationId)}`, { headers: { 'x-api-key': apiKey } });
      const status = await sr.json().catch(() => ({}));
      if (!sr.ok) return res.status(sr.status).json({ error: status.message || 'Gagal memeriksa status upload.' });
      if (status.done) {
        const assetId = status.response?.assetId || status.response?.path?.split('/').pop();
        if (assetId) return res.json({ assetId: String(assetId) });
        return res.status(400).json({ error: status.error?.message || 'Roblox gagal memproses file.' });
      }
    }
    res.status(202).json({ error: 'Upload masih diproses Roblox. Cek Creator Dashboard beberapa saat lagi.' });
  } catch (e) { res.status(502).json({ error: e.message || 'Upload gagal.' }); }
});

const port = process.env.PORT || 10000;
app.listen(port, '0.0.0.0', () => console.log('Uploader running on port ' + port));
