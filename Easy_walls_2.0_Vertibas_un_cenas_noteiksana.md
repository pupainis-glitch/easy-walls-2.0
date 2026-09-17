# Lietotnes «Easy walls 2.0» vērtības un cenas noteikšana
*Metodoloģisks un stratēģisks ceļvedis sadarbībai un cenu sarunām ar Latvijas Nacionālo mākslas muzeju (LNMM)*

---

| Parametrs | Vērtība |
| :--- | :--- |
| **Projekts** | Easy walls 2.0 (LNMM izstāžu zāļu modulāro sienu plānošanas rīks) |
| **Mērķauditorija** | Izstāžu kuratori, arhitekti, montāžas un tehniskā vadība |
| **Dokumenta mērķis** | Sniegt strukturētu pamatojumu produkta finansiālās vērtības aprēķināšanai un sagatavoties sarunām par atlīdzību / licences līgumu. |

> **💡 STRATĒĢISKAIS KOPSAVILKUMS**  
> «Easy walls 2.0» nav tipiska tīmekļa vietne vai vienkārša datu bāzes forma. Tas ir **specializēts inženiertehniskais mikro-CAD rīks** ar pielāgotu ģeometrijas un renderēšanas dzinēju, automātisko PDF rasējumu mērogošanu, kolīziju novēršanu un tūlītēju svara/elementu specifikācijas aprēķinu. Šādu specializētu rīku vērtību nenosaka tikai ieguldītais laiks, bet gan ilgtermiņa ekonomiskais ieguvums pasūtītājam un unikālā domēna loģika.

---

## 1. Produkta specifika un tehniskā sarežģītība

Lai sarunās ar pasūtītāju pamatotu adekvātu cenu, ir svarīgi definēt, ar ko šī sistēma atšķiras no parastas programmēšanas:

* **Pielāgots Canvas 2D renderēšanas dzinējs:** Reāllaika koordinātu transformācijas (*World-to-Screen*, *Screen-to-World*, *World-to-Grid*) ar augstu veiktspēju un brīvu mērogošanu.
* **Vektoru PDF automātiskā mērogošana:** Iebūvēts analītisks algoritms (lineārā regresija), kas automātiski atpazīst rasējuma izmēru anotāciju ķēdes un aprēķina precīzu mērogu (piem., 1:100, 1:50) bez manuālas kļūdainas kalibrēšanas.
* **Fiziskā ģeometrija un magnētiskā snapošana:** L, T, X un Z veida savienojumu porti, 500 mm bāzes solis un stingra kolīziju bloķēšana, kas nepieļauj fiziski neiespējamu sienu pārklāšanos.
* **Automātiskā specifikācija un svara aprēķins:** Lietotne reāllaikā klasificē moduļu tipus (`M-LN`, `M-TC`, `M-LL`, `M-LR` utt.) un kalkulē kopsvaru, kas ir kritiski svarīgi vēsturiskajām telpām (Arsenāls, Birža).
* **Lokalizācija un gatavība lietošanai:** Datu glabāšana pārlūkā (*LocalStorage*), JSON projektu eksports/imports un darba zonas ar vizuāliem priekšskatījumiem.

---

## 2. Trīs metodes produkta vērtības noteikšanai

Programmatūras nozarē pielāgotiem risinājumiem izmanto 3 klasiskas vērtēšanas metodes. Ieteicams izmantot to kombināciju, lai iegūtu pamatotu cenu koridoru:

### Metode A: Izmaksu bāzētā pieeja (*Cost-Plus / Time & Materials*)
Aprēķins balstās uz faktiski ieguldīto un plānoto darba apjomu (stundām) un atbilstošu tirgus likmi:

* **Prasību izpēte un arhitektūra:** Darbs ar muzeja zāļu plāniem, moduļu tehnisko rasējumu izpēte, CAD loģikas projektēšana (~20–30 h).
* **Pamatdzinēja un matemātikas programmēšana:** Canvas dzinējs, koordinātu telpas, PDF analītika, kolīzijas un savienojumu loģika (~70–100 h).
* **Lietotāja saskarne (UI/UX) un datu pārvaldība:** Tumšais interfeiss, zāļu pārslēgs, dialogi, JSON imports/eksports (~30–45 h).
* **Kalibrēšana, reālo zāļu integrācija un testēšana:** Arsenāla un Biržas plānu pārbaude, lietojamības testi (~20–30 h).
* **Dokumentācija un nodošana:** Lietošanas pamācība, tehniskā specifikācija, instruktāža darbiniekiem (~10–15 h).

> **Aprēķins:** Projektā tipiski ieguldītas **150 – 220 inženierstundas**. Pie vidējās Latvijas neatkarīgā programmētāja likmes **40 – 55 €/h** šīs pieejas bāzes vērtība ir **6 000 – 11 000 EUR** (atkarībā no nodokļu režīma un precīzās stundu uzskaites).

---

### Metode B: Vērtības bāzētā pieeja (*Value-Based Pricing*)
Šī pieeja skatās uz **ekonomisko un operatīvo labumu**, ko rīks sniedz LNMM ikdienas darbā:

1. **Kuratoru un arhitektu laika ietaupījums:**  
   Iepriekš izstādes izkārtojuma zīmēšana un elementu manuāla skaitīšana prasīja dienas vai pat nedēļas dārga speciālista laika. Ar «Easy walls 2.0» koncepciju var salikt un izmainīt dažu stundu laikā.  
   *Ietaupījums: 20–40 stundas uz vienu izstādi (gadā 6–10 izstādes = 150–400 stundas ietaupījuma gadā).*
2. **Montāžas kļūdu un dīkstāves novēršana:**  
   Kļūda specifikācijā (piem., montāžas dienā pietrūkst 4 moduļi vai savienojums nav fiziski iespējams) nozīmē montieru komandas dīkstāvi, papildu transportu un grafika nobīdi. Viena novērsta kļūda ietaupa 500 – 1 500 EUR montāžas izmaksās.
3. **Pārsegumu nestspējas drošība:**  
   Vēsturiskās ēkās (īpaši Arsenālā un Biržā) grīdu pieļaujamā slodze ir stingri ierobežota. Automātiskā svara kalkulācija novērš riskus vēsturiskajam mantojumam un atbildīgajām personām.

---

### Metode C: Aizvietošanas un tirgus izmaksu pieeja (*Replacement Cost*)
Cik šāds risinājums LNMM izmaksātu, ja viņi to pasūtītu brīvajā tirgū?

* **Standarta CAD licences:** AutoCAD vai Vectorworks licences maksā 1 500 – 3 500 € gadā par katru darba vietu. Tās prasa augsti apmācītus operatorus un nesatur LNMM specifiskos moduļus vai automātiskos izstāžu svara aprēķinus.
* **Izstrāde IT aģentūrā:** Ja muzejs šādu tehnisko specifikāciju izsludinātu konkursā IT izstrādes uzņēmumiem, aģentūras tāme par pielāgotu Canvas dzinēju, algoritmiem un testēšanu parasti svārstītos robežās no **10 000 līdz 22 000 EUR + PVN**.

---

## 3. Piedāvājuma komerciālā struktūra (3 līmeņu modelis)

Valsts iestādēm visvieglāk ir pieņemt piedāvājumu, kas ir skaidri sadalīts funkcionālajās un uzturēšanas daļās:

| Pozīcija | Satura apraksts | Ieteicamais apmaksas veids |
| :--- | :--- | :--- |
| **1. Izstrāde un ieviešana** | Gatava lietotne ar visiem CAD rīkiem, PDF mērogošanu, moduļu specifikāciju un Arsenāla/Biržas plānu kalibrāciju. | Vienreizējs fiksēts maksājums (var dalīt 50/50 pa posmiem) |
| **2. Lietošanas rokasgrāmata un apmācība** | Sagatavota PDF instrukcija un 1–2 praktiskās apmācību sesijas muzeja darbiniekiem un arhitektiem. | Iekļauts bāzes cenā vai fiksēta neliela pozīcija |
| **3. Garantija un kļūdu labošana** | 3–6 mēnešu garantijas periods, kura laikā bez papildu maksas tiek novērstas atklātās nepilnības. | Iekļauts izstrādes cenā |
| **4. Tehniskā uzturēšana un attīstība** | Ikgadējs atbalsts: jaunu zāļu plānu kalibrēšana, jaunu moduļu tipu pievienošana, pārlūku atbalsts. | Gada abonements (10–15% no izstrādes vērtības) vai stundu fonds |

---

## 4. Intelektuālais īpašums un licences veids (KRITISKS PUNKTS)

Šis ir viens no būtiskākajiem faktoriem, kas ietekmē gan cenu, gan tavu nākotnes biznesa potenciālu:

### Variants A: Neekskluzīva lietošanas licence (STRATĒĢISKI IETEICAMS)
* **Kā tas darbojas:** LNMM saņem pastāvīgas, neierobežotas tiesības lietot lietotni visām muzeja vajadzībām un nepieciešamības gadījumā to modificēt saviem mērķiem.
* **Autora tiesības:** Tu saglabā programmatūras dzinēja autortiesības un tiesības šo pašu tehnoloģiju pielāgot un piedāvāt **citiem muzejiem, izstāžu zālēm un galerijām** (piem., Hanzas perons, Cēsu koncertzāle, Daugavpils Rotko centrs, ārvalstu muzeji).
* **Cenas ietekme:** Muzejam var piedāvāt pievilcīgāku cenu, jo tu saglabā komerciālo potenciālu nākotnē.

### Variants B: Pilna autortiesību atsavināšana (*Work for Hire* / Ekskluzīvas tiesības)
* **Kā tas darbojas:** LNMM kļūst par vienīgo koda un zīmola īpašnieku. Tu vairs nedrīksti šo dzinēju izmantot nevienam citam klientam.
* **Cenas ietekme:** Šādā gadījumā cenai jābūt **vismaz par 50% līdz 100% augstākai**, jo tiek atdots viss nākotnes tirgus potenciāls.

---

## 5. Praktiskie cenu scenāriji sarunām

| Piedāvājuma līmenis | Iekļautais apjoms | Orientējošā cena |
| :--- | :--- | :--- |
| **Bāzes (MVP)** | Pašreizējā lietotne, Arsenāla un Biržas zāļu kalibrācija, pamata kļūdu labojumi 60 dienas. | **4 500 – 6 500 EUR** |
| **Standarta (IETEICAMĀ)** | Pilna lietotne + Lietotāja rokasgrāmata (PDF) + 2 apmācību nodarbības + 6 mēnešu garantija + neekskluzīva licence. | **7 000 – 9 800 EUR** |
| **Pilnā pakete ar uzturēšanu** | Standarta pakete + 1 gada uzturēšanas līgums (līdz 2 jaunu zāļu ieviešanai un papildu moduļu konfigurācija). | **9 800 – 12 500 EUR** |

---

## 6. LNMM specifika un sarunu taktika valsts iestādē

Sarunās ar valsts muzeju ir jāņem vērā valsts pārvaldes un Publisko iepirkumu likuma specifika:

1. **Iepirkumu sliekšņi:**  
   Līdz noteiktam slieksnim (atkarībā no iestādes iekšējās kārtības, bieži līdz 10 000 EUR bez PVN) iestāde var veikt zemsliekšņa iepirkumu vai tiešo līgumu/cenu aptauju bez sarežģīta atklāta konkursa. Tāpēc piedāvājums zonā ap **7 000 – 9 500 EUR** bieži ir visreālāk realizējamais un administratīvi vieglākais.
2. **Finansējuma piesaiste:**  
   Noskaidro, no kāda avota iestāde plāno maksāt — pamatbudžeta atlikums, VKKF mērķprogramma vai digitalizācijas projekts. Bieži gada otrajā pusē iestādēm ir brīvi līdzekļi konkrētos inovāciju pantos.
3. **Līguma noformējums:**  
   Jāsaskaņo, kāds būs izpildītāja statuss: uzņēmuma rēķins (SIA ar vai bez PVN), pašnodarbinātā rēķins vai Autortiesību līgums ar fizisku personu (kur iestāde pati aprēķina un ietur nodokļus).

---

## 7. Kontrolsaraksts pirms tikšanās ar pasūtītāju

- [ ] **Apkopo precīzu ieguldīto stundu skaitu** pa etapiem (dzinējs, PDF algoritms, zāļu plāni, UI).
- [ ] **Sagatavo dzīvo demonstrāciju:** parādi, cik minūtēs tiek uzģenerēta gatava specifikācija un svara aprēķins salīdzinājumā ar veco metodi.
- [ ] **Definē licenci kā neekskluzīvu:** uzsver, ka tas ļauj muzejam saņemt izdevīgāku cenu bez liekām autoratlīdzības nodevām.
- [ ] **Uzklausi muzeja budžeta rāmi:** Pirms striktas gala summas nosaukšanas uzdod jautājumu: *«Kāds ir jūsu plānotais budžeta koridors šāda veida digitalizācijas rīkiem?»*

---
*Fails sagatavots izmantošanai un importam Google Docs / Microsoft Word vidē.*
