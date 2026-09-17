# Arsenāls — Modulāro sienu stabilitātes kalkulators
## Izstrādes kopsavilkums

**Projekts:** Izstāžu zāle "Arsenāls" — modulāro starpsienu sistēma  
**Fails:** `arsenals_kalkulators.html` (single-file standalone HTML)  
**Firebase (live app):** [https://sienu-stabilitates-kalkulators.web.app](https://sienu-stabilitates-kalkulators.web.app)  
**Deploy:** `cd E:\DARBI\LNMM\Komunikācija\firebase && firebase deploy --only hosting`

---

## Kalkulatora funkcionalitāte

### Ievaddati (slīdņi)
| ID | Parametrs | Diapazons | Noklusējums |
|----|-----------|-----------|-------------|
| H | Sienas augstums | 1.0–6.0 m | 3.4 m |
| W | Platums | 0.5–6.0 m | 2.0 m |
| T | Biezums | 0.2–1.5 m | 1.0 m |
| Ok | Kājas nobīde no malas | 0.02–0.18 m | 0.16 m |
| Mi | Instalācijas slodzes masa | 0–100 kg | 100 kg |
| Oi | Ekscentricitāte | 0–1.0 m | 0.6 m |
| Hi | Montāžas augstums | 0–4.0 m | 1.85 m |
| Og | Atstatums no grīdas | 0–0.3 m | 0.10 m |
| SF | Drošības koeficients | 2.0–5.0 | 2.0 |
| **F** | **Grūdiena spēks** | **0–500 N** | **150 N** |

### Aprēķina gaita

#### 1. Apgāšanas moments
```
d = T/2 − Ok                          (attālums no SC līdz balsta līnijai)
Mₐ,grūdiens = F × 1.5                (horizontālā slodze)
Mₐ,slodze   = Mi × g × (Oi − d)     (instalācijas ekscentricitāte)
Mₐ,augstums = 0.10 × Mi × g × Hi    (horizontālā inerces komponente)
ΣMₐ = summa
```

#### 2. Konstrukcijas pašsvars
```
M_rāmis = (2(H+W) + 4T) × 3.14 kg/m   ← 4T = stūra dziļuma stieņi
M_MDF   = 2 × H × W × 0.016 × 750      ← 2 paneļi × 16mm × ρMDF
Mₛ = M_rāmis + M_MDF
```
> **Piezīme:** `T` neietekmē MDF svaru (paneļi vienmēr 2×16mm), bet ietekmē Al karkasu caur 4 stūra profiliem.

#### 3. Betona balasts
```
M_nepiec = SF × ΣMₐ / (g × d)
M_betons = M_nepiec − Mₛ
L₁ = starp kājām − 0.1 m
W₁ = T − 2×Ok − 0.1 m
H_b = M_betons / (ρ_betons × L₁ × W₁)   (ar 5° sānu slīpni)
```

#### 4. Stabilitātes pārbaude
```
SF_fakt = (Mₛ + Mb) × g × d / ΣMₐ ≥ SF
```

#### 5. Balsta kāju reakcija
```
N_apmeklētāja = (SF−1) × ΣMₐ / (4d)     (dinamiskā slodze, mazāka)
N_mākslas     = Mtot × g/2 − N_apmeklētāja (statiskā, lielāka)
N_max = max(N_apmeklētāja, N_mākslas)     → dimensionēšanas vērtība
```

### Konstantes
| Lielums | Vērtība |
|---------|---------|
| g | 9.81 m/s² |
| ρ_betons | 2400 kg/m³ |
| ρ_MDF | 750 kg/m³ |
| Al karkasa lin. masa | 3.14 kg/m |
| MDF apšuvums | 2 × 16 mm |
| Horizontālā slodze h | 1.5 m (fiksēts) |

---

## Tehniskie risinājumi

### Kritiskais `</script>` kļūda
**Problēma:** `printDoc()` funkcija ģenerē HTML template literal (`const html=\`...\``). Ja iekšā ir `</script>` tags, pārlūka HTML parser to uztver kā galvenā `<script>` taga slēgšanu → visi zemāk definētie funkcijas (`drawSVGs`, `update`, `toggleCalc` u.c.) netiek definēti → SVG tukši, rezultāti "—".

**Risinājums:** Template literal iekšā nedrīkst būt `</script>`. Print aktivizācija pārcelta uz:
```javascript
w.addEventListener('load', () => { setTimeout(() => { w.print(); }, 500); }, {once:true});
```

### Blob URL pieeja PDF eksportam
```javascript
const blob = new Blob([html], {type:'text/html;charset=utf-8'});
const url = URL.createObjectURL(blob);
const w = window.open(url, '_blank');
w.addEventListener('pagehide', () => URL.revokeObjectURL(url));
```

### Faila saglabāšanas stratēģija
Edit rīks pie lieliem template literal izgriezis faila beigas 4+ reizes. Drošāka pieeja: Python `f.read()` → `str.replace()` → `f.write()`.

---

## Fizikālās diskusijas

### Kāpēc palielinot H, balasts samazinās?
- ΣMₐ **nemainās** (F, h, Mi, Oi, Hi ir fiksētas ievadvērtības)
- Mₛ **pieaug** (garāks Al karkass, lielāka MDF platība)
- M_nepiec = SF×ΣMₐ/(g×d) = konstants
- **Mb = M_nepiec − Mₛ samazinās** ✓ Fiziski pareizi — smagāka siena mazāk nepieciešama ārējā balasta.

### Par horizontālo slodzi F = 150 N
- Nav tieši no EN 1991-1-1 (standarts dod sadalītu slodzi kN/m, nevis punktslodzi)
- 150 N ≈ "apzināts viegls spēriens" (~15 kg ekvivalents)
- Realāks scenārijs (90 kg cilvēks paklūp): F = m×v/Δt = 90×1.0/0.2 ≈ **450–500 N**
- EN 1991-1-1 C kategorija (publiski savākšanās): 0.5–1.0 kN/m sadalīta horizontāle
- **Ieteikums publiski izstāžu telpām: F ≥ 500 N**

### Konstrukcijas pašsvars un T
**Kļūda atrasta:** `M_rāmis = 2(H+W)×AL_W` neietver dziļuma stieņus.  
**Labojums:** `M_rāmis = (2(H+W) + 4T) × AL_W`  
Efekts: T=0.80 → +10 kg; T=1.00 → +12.6 kg (neliels bet fiziski korekts).

---

## Dokumentu eksports (2 lappuses A4)
- **1. lapa:** Ievaddati + sānskats SVG + pretskats SVG
- **2. lapa:** Rezultātu kopsavilkums + aprēķina gaita + piezīmes + standartu atsauces
- Metadata lauki: Projekts, Dok. Nr., Izstrādāja (ievadāmi kalkulatorā)
- Eksports: `window.open(blobUrl)` → `w.print()` dialogs

---

## Izmaiņu žurnāls (šajā sesijā)

1. **N_max balsta kāju reakcija** — pievienota aprēķinā un rezultātu kartītē
2. **Metadata ievadlauki** — Projekts, Dok. Nr., Izstrādāja
3. **2-lapu PDF eksports** — `printDoc()` funkcija ar Blob URL pieeju
4. **Kritiskā `</script>` kļūda izlabota** — JS bija saīsināts, visi funkcijas nebija definēti
5. **M_rāmis ar 4T dziļuma stieņiem** — fiziski precīzāks pašsvars
6. **F_PUSH slīdnis** — horizontālā slodze kļuva regulējama (0–500 N)
7. **Formula paraksti atjaunināti** — izdrukā un UI

