# Easy walls 1.0 — nodošanas specifikācija

Projekts: LNMM modulāro izstāžu sienu izkārtojuma rīks (Arsenāls, Biržas nams).
Šis dokuments apkopo visu, kas noskaidrots iepriekšējā sarunā, lai darbu varētu turpināt Claude Code vidē.

Statuss: **1. slānis (plāns + režģi) ir uzbūvēts un strādā. 2. slānis (moduļi) ir specificēts, bet nav uzbūvēts.**

---

## 1. Mērķis

Web rīks, kurā uz kalibrēta telpas plāna izvieto modulārās sienas — līdzīgi kā Blockly/Scratch blokus, kur ģeometrija pati novērš kļūdainu montāžu. Rezultāts: izkārtojums + automātiski ģenerēta moduļu specifikācija.

Trīs slāņi, katrs saglabājams:

1. **Plāns** — PDF/attēls ar noteiktu mērogu
2. **Režģi** — koordinātu sistēmas, katrai telpai sava
3. **Moduļi** — sienu izkārtojums *(vēl nav uzbūvēts)*

Ilgtermiņā pāreja uz online risinājumu: izvēlas darba zonu, uzliek sienas, saglabā kā nosauktu failu (piem. `Arsenāls — telpa X, izstāde YY`).

---

## 2. Kas jau ir uzbūvēts

Fails: `easy-walls-darba-zona.html` — viens pašpietiekams HTML fails, bez būvēšanas soļa. Atkarības: pdf.js 3.11.174 no cdnjs.

### Funkcijas

- PDF (vektoru) un rastra attēlu ielāde, daudzlapu navigācija
- **Automātiska mēroga noteikšana pēc izmēru ķēdes** (skat. 2.1)
- Manuāla kalibrācija pēc zināma attāluma; mērlente
- Neierobežots skaits neatkarīgu režģu, katram sava krāsa, leņķis, nobīde, solis, redzamība
- Sākumpunkta novietošana ar klikšķi + bloķēšana
- Apakšējā horizontālā vadības josla; pēc saglabāšanas saraujas plānā strēmelē
- Darba zonu bibliotēka ar sīkbildēm, eksports/imports JSON

### 2.1 Mēroga noteikšanas algoritms

Vērtīgākā daļa — nepārrakstīt no nulles.

1. `page.getTextContent()` → atlasa tekstus, kas izskatās pēc izmēriem mm (veseli skaitļi 200…300000, atstarpe kā tūkstošu atdalītājs)
2. Grupē pēc pagrieziena (mod 180°) un šķērseniskās koordinātes (4 pt grozi, apvieno blakus grozus)
3. Katrā grupā: teksts sēž sava nogriežņa **vidū**, tātad i-tā teksta reālā pozīcija = `Σ(iepriekšējie) + d_i/2`
4. Lineārā regresija `cum(mm)` pret `t(pt)` → slīpums = mm uz punktu
5. Ja R² < 0,99995, izmet lielākās novirzes punktu un atkārto (līdz 3 reizes)
6. `denom = mmPerPt / (25.4/72)`; ja 0,5 % robežās no standarta mēroga — pieņem standartu
7. Pārbaude: ja lapā ir teksts, kas 2 % robežās sakrīt ar ķēdes summu → `confirmed`

Pārbaudīts pret reālu Arsenāla ķēdi: simulējot 1:100, algoritms atgriež 100,000.

### 2.2 Zināmās nianses

- Decimāldaļas: visi lauki ir `type=text` ar savu parsētāju, kas pieņem **gan komatu, gan punktu**
- Glabātuve: `window.storage` → `localStorage` → atmiņa; `Store.kind` rāda, kurš aktīvs
- Attēls saglabājas kā JPEG ar automātisku samazināšanu, ja ieraksts > 3,6 MB; `R` tiek pārrēķināts, lai mērogs paliktu pareizs
- Mērogs glabājas kā `mppPt` (metri uz PDF punktu), nevis uz attēla pikseli — tāpēc tas ir neatkarīgs no renderēšanas izšķirtspējas

### 2.3 Datu formāts

```jsonc
{
  "schema": "easywalls.workzone/1",
  "id": "wz_...", "name": "Arsenāls — 1. stāvs", "updated": 1234567890,
  "plan": {
    "fileName": "...", "page": 1,
    "image": "data:image/jpeg;base64,...",
    "widthPx": 2400, "heightPx": 1700,
    "R": 2.4,              // attēla px uz PDF punktu
    "mppPt": 0.0352778,    // metri uz PDF punktu
    "denom": 100,          // rasējuma mērogs, ja zināms
    "detected": { "n": 12, "total": 133941, "confirmed": true }
  },
  "grids": [
    { "id":1, "name":"Zāle A", "color":"#e0489b",
      "angle":0, "dx":0, "dy":0, "step":0.5, "visible":true, "locked":true }
  ],
  "view": { "x":0, "y":0, "z":60 },
  "thumb": "data:image/jpeg;base64,...",
  "modules": []            // 2. slānis — vēl tukšs
}
```

Koordinātas metros pasaules sistēmā; attēla augšējais kreisais stūris = (0,0).

---

## 3. Moduļu ģeometrija (2. slānis — būvējams)

Nominālie izmēri **bez paneļiem**. Paneļi 16 mm ir atsevišķs, vēlāks līmenis — šajā solī tos neņem vērā.

| Modulis | Pēda plānā |
|---|---|
| Lielais | 2000 × 1000 mm |
| Mazais | 1000 × 1000 mm |

### 3.1 Pamatprincipi

- **Viss sēž uz 500 mm režģa.** Ne uz 1000 mm — to nosaka T savienojums (skat. zemāk)
- **Moduļi nekad nepārklājas.** Tie saduras ar skaldnēm
- Snapošanas punkti: **ik pa 500 mm pa visu perimetru** (stūri + malu dalījuma punkti)
- Novietošanas enkurs: **moduļa centrs**
- Pagriezieni: **tikai 90° soļos**, aktīvā režģa koordinātu sistēmā
- Prioritāte: **režģis primārs, bet kaimiņa ports uzvar, ja abi konfliktē**

### 3.2 Divi atšķirīgi bāzēšanas principi

Šī ir sistēmas galvenā smalkumu vieta:

- **L savienojums bāzējas pēc ārējām malām** — abu moduļu ārējās skaldnes sakrīt
- **T un X bāzējas pēc centra līnijas** — zara ass sakrīt ar pamata moduļa garās malas viduspunktu

Tāpēc zars sēž uz pusmetra līnijas, nevis uz metra līnijas. Rindā, kurai vienā galā ir L stūris un vidū T zars, zara ass ir par 500 mm nobīdīta no moduļu robežām. Tā ir sistēmas īpašība, nevis kļūda.

### 3.3 Savienojumu veidi ar gabarītiem

Visi nomērīti no `Snap_loģika.png` un `LNMM-M3-1020.pdf`:

| Veids | Sastāvs | Kopgabarīts |
|---|---|---|
| Līnija | 2 × lielais, gals pret galu | 4000 × 1000 |
| L (pa labi / pa kreisi) | 2 × lielais, ārējās malas sakrīt | 2000 × 3000 |
| T | 2 × lielais, centra līnijas sakrīt | 2000 × 3000 |
| X ar lielo centrā | 3 × lielais, zari pret garajām malām | 5000 × 2000 |
| X ar mazo centrā | 1 × mazais + 4 × lielais | 5000 × 5000 |
| Z (pa labi / pa kreisi) | 2 × lielais paralēli, nobīde **1000 mm** gar garumu, saskaras ar garajām malām | 2000 × 3000 |
| Brīvstāvošs | 1 modulis, neviens ports nav aizņemts | 2000 × 1000 vai 1000 × 1000 |

Mazo moduli var lietot kā starpposmu, pagriezienu, krustpunktu vai brīvstāvošu elementu.

### 3.4 Ieteicamais portu modelis

Lielais modulis, lokālās koordinātēs no centra, X gar garumu:

- gala porti `(−1000, 0)` un `(+1000, 0)`
- sānu porti `(0, −500)` un `(0, +500)`
- papildu snapošanas punkti ik pa 500 mm pa perimetru

Mazais modulis: četri vienādi porti pa 500 mm no centra.

Savienojuma meklēšana pēc `dragend`: atrast tuvāko savietojamo portu pāri tolerances rādiusā, pārbīdīt moduli tā, lai porti sakristu. Ja nesavietojams — snapošana nenotiek.

---

## 4. Moduļu tipu automātiska noteikšana

Programmai **jānosaka tips pēc kaimiņiem un jāizvada specifikācija**. Tipi un svari no `LNMM-M2-1020` komponentu saraksta:

| Kods | Apraksts | Svars, kg |
|---|---|---|
| M-LN | Typical module 2x1m (Line) | 201,97 |
| M-IN | Typical module 2x1m (Intersection) | 207,11 |
| M-FS | Typical module 2x1m (Free standing) | 196,83 |
| M-LL | Typical module 2x1m (L type — L) | 201,95 |
| M-LR | Typical module 2x1m (L type — R) | 201,95 |
| M-EL | Typical module 2x1m (End of line) | 199,40 |
| M-TC | Typical module 2x1m (T-connection) | 204,54 |
| M-ZR | Typical module 2x1m (Z-type R) | 201,98 |
| M-ZL | Typical module 2x1m (Z-type L) | 202,85 |
| M-UN-L | 1x1m universal module | 145,53 |
| M-UN-R | 1x1m universal module | 148,56 |
| M-CL | Module around the column | — |

Specifikācijā: daudzumi pa tipiem + kopējais svars. Atsauces rasējumā kopsvars 7911,73 kg.

Paneļi (nākamajam līmenim, augstums visiem 3350): P-2000, P-1000, P-968-E, P-660-R/L, P-1160-L/R, P-984-R/L, P-1302.

---

## 5. Neatrisinātie jautājumi

1. **Kolonnas.** Rasējumā tukšs kvadrāts 1350 × 1350 mm, ap kuru iet M-CL. Vai kolonnu atzīmēšana vajadzīga jau šajā solī vai vēlāk — neatbildēts
2. **Pārklāšanās kontrole.** Vai programmai jāliedz pārklāšanās, vai tikai jābrīdina
3. **Ekspozīcijas skaldnes.** Vai jārāda, kuras skaldnes ir izmantojamas gleznu izlikšanai (lietderīgais garums) — nav apspriests
4. **Numerācija.** Vai katram novietotajam modulim vajag ID/marķējumu plānā

---

## 6. Tehniskais konteksts

- Plānu mape: `E:\DARBI\LNMM\Easy walls 1.0\Arsenāls plāni`
- Rasējumi: `LNMM-M2-1020` (typical module connections, A3, 1:25), `LNMM-M3-1020` (A1, izometrija + plāna simboli 1:75)
- Rasējumi no SolidWorks 2020; PDF saturs ir **rastrs**, nevis vektorlīnijas — teksta slānis gan ir, tāpēc mēroga algoritms strādā
- Darba valoda: latviešu; kods un identifikatori angliski
- Snapošanas atsauce: Konva.js objektu snapošanas demo

## 7. Ieteicamā secība Claude Code vidē

1. Pārnest `easy-walls-darba-zona.html` uz projekta mapi kā izejas punktu
2. Sadalīt moduļos (plan, grid, store, ui) — viens fails jau ir uz robežas
3. Uzbūvēt moduļu slāni: datu modelis → renderēšana → portu snapošana → tipu noteikšana → specifikācija
4. Tikai tad ķerties pie paneļu līmeņa
