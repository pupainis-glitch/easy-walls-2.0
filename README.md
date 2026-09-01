# Easy walls 2.0

LNMM modulāro izstāžu sienu izkārtojuma rīks (Arsenāls, Biržas nams).

🌐 **Tiešsaistes lietotne**: [https://pupainis-glitch.github.io/easy-walls-2.0/](https://pupainis-glitch.github.io/easy-walls-2.0/)

Tīmekļa lietotne izstāžu arhitektiem un kuratoriem, kas ļauj uz kalibrētiem telpu plāniem izvietot modulārās izstāžu sienas, automātiski aprēķinot to savienojumus, tipus un kopējo svaru.

## Galvenās iespējas

- **Plānu un rasējumu ielāde**: PDF (vektoru) un rastra formātu atbalsts ar daudzlapu navigāciju.
- **Automātiska mēroga noteikšana**: Iebūvēts lineārās regresijas algoritms, kas nolasa PDF izmēru anotāciju ķēdes un automātiski nosaka rasējuma mērogu (piem., 1:100).
- **Elastīgi koordinātu režģi**: Neierobežots skaits neatkarīgu režģu ar pielāgojamu leņķi, nobīdi, soli un bloķēšanu.
- **Modulāro sienu izvietošana (2. slānis)**:
  - Lielais modulis (2000 × 1000 mm)
  - Mazais modulis (1000 × 1000 mm)
  - 500 mm bāzes solis un magnētiskā portu snapošana (L, T, X, Z savienojumi).
  - Pilnīga fiziskās pārklāšanās bloķēšana.
- **Automātiskā moduļu klasifikācija**: Nosaka moduļu tipus (M-LN, M-TC, M-LL, M-LR, M-IN, M-EL, M-FS utt.) un aprēķina specifikāciju ar kopsvaru.
- **Lokālā glabātuve un JSON eksports/imports**: Darba zonu bibliotēka ar sīkbildēm.

## Projekta struktūra

```
Easy walls 2.0/
├── index.html               # Galvenais HTML ieejas punkts
├── css/
│   └── style.css            # Lietotnes stili (tumšā tēma, vadības joslas, dialogi)
├── js/
│   ├── config.js            # Konfigurācija, izmēri, svari, universālās palīgfunkcijas
│   ├── state.js             # Centralizētais aplikācijas stāvoklis (State)
│   ├── grid.js              # Režģu ģeometrija un koordinātu transformācijas (w2s, s2w, w2g, g2w)
│   ├── store.js             # Glabātuve (localStorage, Store) un zonu serializācija
│   ├── pdf-scale.js         # PDF mēroga automātiskā noteikšana pēc izmēru ķēdes
│   ├── renderer.js          # Kanvas renderēšanas dzinējs
│   ├── interaction.js       # Peles, skārienu un tastatūras ievades apstrāde
│   ├── ui.js                # Lietotāja saskarnes vadība, modāļi, čipi
│   ├── app.js               # Aplikācijas inicializācija un notikumu sasaiste
│   └── modules/             # 2. slāņa moduļu loģika (ģeometrija, kolīzijas, snapošana, klasifikācija)
├── Arsenāls plāni/          # Izstāžu zāles plāni un snap loģikas rasējums
└── EASY-WALLS-SPEC.md       # Tehniskā specifikācija
```

## Palaišana

Lietotni var palaist:
1. Atverot `index.html` jebkurā mūsdienīgā tīmekļa pārlūkā.
2. Izmantojot vienkāršu lokālo serveri (ieteicams pilnai PDF.js un failu apstrādei):
   ```bash
   npx serve .
   # vai
   python -m http.server 8000
   ```
