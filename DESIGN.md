# Mabar Party — design
Interpretation: "aplikasi kayak AirConsole" → satu HP jadi **Layar/Host** yang menjalankan game,
HP lain (sampai 4) jadi **Controller** lewat kode room 4 huruf. Game ada beberapa, termasuk
balapan 3D split-screen. UI berbahasa Indonesia. Comet Hop dihapus dari repo ini.

## Pitch
Main bareng di satu layar: taruh HP host di tengah (atau mirror ke TV), teman-teman pakai
HP masing-masing sebagai stik. Tanpa kabel, tanpa akun.

## Koneksi
- WebRTC data channel lewat PeerJS (signaling cloud 0.peerjs.com, STUN Google). Paling lancar
  kalau semua HP di Wi-Fi yang sama; butuh internet untuk "salaman" awal.
- Host membuat ID `mabar-<KODE>`; controller `peer.connect()` ke ID itu.
- Mode `?local=1` (BroadcastChannel) untuk tes di browser: host & controller di tab berbeda.
- Controller menyimpan clientId → kalau putus & masuk lagi, dapat slot yang sama.

### Protokol (JSON)
Controller → Host: `hello{name,id}`, `in{x,y,a,b,l,r,gas,brake}` (saat berubah + 12 Hz),
`nav{k:left|right|up|down|ok|back}`, `ans{i}`, `wiggle`, `ping{ts}`.
Host → Controller: `welcome{slot,color,name,room}`, `layout{l,data}`, `buzz{k}`,
`quiz{phase,…}`, `full`, `pong{ts}`, `bye`.

## Layar
Beranda (Host / Controller / Pengaturan / Cara main) →
Host: Lobby (kode besar, 4 slot pemain, pilih game: sentuh kartu atau P1 pakai controller) →
Game → Hasil (podium) → Lobby.
Controller: Gabung (nama + kode) → layout sesuai game (menu, kart, sumo, kuis, tunggu, hasil).
Back: dialog/overlay ditutup dulu → di game host: "Kembali ke lobby?" → beranda.

## Game
1. **Turbo Kart 3D** — split-screen (1 penuh, 2 kiri-kanan, 3–4 grid 2×2), 3 lap, bot mengisi
   sampai 4 mobil, boost pad, off-road melambat, tembok memantul, minimap, hitung mundur.
   Controller: ◀ ▶ + GAS + REM, atau mode miring (tilt).
2. **Sumo Bump 3D** — arena melayang yang mengecil, dorong lawan keluar. Joystick + DASH.
   Bot mengisi sampai 4. Ronde pertama yang menang 3 kali jadi juara.
3. **Kuis Kilat** — 10 soal pengetahuan umum (bank 60 soal), 4 tombol warna di controller,
   poin 500 + bonus kecepatan sampai 500, podium akhir.

## Art direction
Palette "Neon Party": bg #120c2c · surface #1f1747 · pink #ff3d8b · cyan #2de2e6 ·
yellow #ffd23f · green #3ddc84 · purple #8a5cff · text #f5f3ff · outline #0b0720.
Warna pemain: P1 #ff4d6d · P2 #3ab0ff · P3 #ffc93c · P4 #3ddc84.
Font: Baloo 2 (800) judul, Fredoka (600) teks. Tombol tebal dengan alas gelap (efek 3D),
avatar "blob" bulat berwajah. 3D: low-poly cerah, kabut, lampu hemisphere + directional.

## Audio
Musik: lobby=happy 120bpm, kart=action 140bpm, sumo=retro 128bpm, kuis=puzzle 110bpm.
SFX: tap, join, leave, select, start, countdown, go, boost, bump, lap, finish, dash, hit,
fall, roundwin, correct, wrong, tick, win.

## Save
nama pemain, clientId, pengaturan suara/getar, mode kemudi (tombol/miring), statistik
jumlah main per game.
