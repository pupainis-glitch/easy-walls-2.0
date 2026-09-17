/**
 * Easy Walls 2.0 — Mākslas darbu testa kataloga ģenerators (100 eksponāti)
 * 
 * Izveido:
 * 1. Mapi 'catalog_images/' ar 100 augstas kvalitātes, optimizētiem PNG attēliem (ar precīzām proporcijām un muzeja birkām)
 * 2. TSV / CSV failu 'artworks_catalog.csv' (ar tabulācijas atdalītāju, tiešai kopēšanai un Excel)
 * 3. JSON failu 'artworks_100.json' ar iekļautiem Base64 data:image/png;base64,... attēliem
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ============================================================================
// 1. 100 MĀKSLAS DARBU DETALIZĒTIE METADATI
// ============================================================================
const ARTWORKS = [
  // --- GRUPA 1: Miniatūras un grafikas (0.30 - 0.60 m, 3.2 - 11.5 kg, h = 1.30 - 1.50 m) ---
  {
    invNo: 'ASN-001',
    title: 'Pavasara strauts',
    author: 'Vilhelms Purvītis',
    year: '1902',
    technique: 'Papīrs, akvarelis',
    width: 0.35, height: 0.45, weight: 4.2, depth: 0.05, elevation: 1.40,
    theme: 'landscape', subtheme: 'spring', frame: 'dark_walnut', hasMat: true
  },
  {
    invNo: 'ASN-002',
    title: 'Ganu zēns rīta saulē',
    author: 'Janis Rozentāls',
    year: '1898',
    technique: 'Papīrs, ogle, sangīna',
    width: 0.40, height: 0.30, weight: 3.5, depth: 0.04, elevation: 1.50,
    theme: 'modernist', subtheme: 'warm', frame: 'antique_gold', hasMat: true
  },
  {
    invNo: 'ASN-003',
    title: 'Bērza lapa saulē',
    author: 'Johans Valters',
    year: '1905',
    technique: 'Kartons, eļļa',
    width: 0.50, height: 0.50, weight: 6.0, depth: 0.06, elevation: 1.30,
    theme: 'landscape', subtheme: 'autumn', frame: 'baltic_oak', hasMat: false
  },
  {
    invNo: 'ASN-004',
    title: 'Dandy ar orhideju',
    author: 'Kārlis Padegs',
    year: '1931',
    technique: 'Papīrs, tuša, akvarelis',
    width: 0.35, height: 0.50, weight: 4.0, depth: 0.04, elevation: 1.40,
    theme: 'modernist', subtheme: 'graphic', frame: 'modern_black', hasMat: true
  },
  {
    invNo: 'ASN-005',
    title: 'Lietus naktī pār pilsētu',
    author: 'Kārlis Padegs',
    year: '1932',
    technique: 'Papīrs, tuša, zīmulis',
    width: 0.45, height: 0.60, weight: 5.5, depth: 0.05, elevation: 1.30,
    theme: 'minimalist', subtheme: 'night', frame: 'silver_aluminum', hasMat: true
  },
  {
    invNo: 'ASN-006',
    title: 'Bēgles skice',
    author: 'Jēkabs Kazaks',
    year: '1917',
    technique: 'Papīrs, zīmulis, tuša',
    width: 0.30, height: 0.40, weight: 3.2, depth: 0.04, elevation: 1.50,
    theme: 'modernist', subtheme: 'sepia', frame: 'dark_walnut', hasMat: true
  },
  {
    invNo: 'ASN-007',
    title: 'Itālijas motīvs ar arkādi',
    author: 'Niklāvs Strunke',
    year: '1924',
    technique: 'Papīrs, krāsu litogrāfija',
    width: 0.55, height: 0.45, weight: 6.8, depth: 0.05, elevation: 1.40,
    theme: 'constructivist', subtheme: 'italian', frame: 'antique_gold', hasMat: true
  },
  {
    invNo: 'ASN-008',
    title: 'Klusā daba ar pīpi un kausu',
    author: 'Romans Suta',
    year: '1923',
    technique: 'Kartons, tempera',
    width: 0.40, height: 0.50, weight: 5.0, depth: 0.05, elevation: 1.40,
    theme: 'modernist', subtheme: 'cubist', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-009',
    title: 'Baletdejotājas portrets',
    author: 'Aleksandra Beļcova',
    year: '1925',
    technique: 'Papīrs, sangīna, pastelis',
    width: 0.35, height: 0.45, weight: 3.8, depth: 0.04, elevation: 1.50,
    theme: 'modernist', subtheme: 'pastel', frame: 'silver_aluminum', hasMat: true
  },
  {
    invNo: 'ASN-010',
    title: 'Dinamiskā pilsēta (Skice)',
    author: 'Gustavs Klucis',
    year: '1920',
    technique: 'Papīrs, fotomontāža, tuša',
    width: 0.50, height: 0.40, weight: 5.2, depth: 0.05, elevation: 1.40,
    theme: 'constructivist', subtheme: 'avantgarde', frame: 'modern_black', hasMat: true
  },
  {
    invNo: 'ASN-011',
    title: 'Pārdaugavas dārzs pavasarī',
    author: 'Konrāds Ubāns',
    year: '1934',
    technique: 'Papīrs, akvarelis',
    width: 0.45, height: 0.35, weight: 4.5, depth: 0.04, elevation: 1.40,
    theme: 'landscape', subtheme: 'spring', frame: 'baltic_oak', hasMat: true
  },
  {
    invNo: 'ASN-012',
    title: 'Eksotiskā maska',
    author: 'Voldemārs Matvejs',
    year: '1912',
    technique: 'Kartons, tempera',
    width: 0.60, height: 0.45, weight: 7.5, depth: 0.06, elevation: 1.30,
    theme: 'modernist', subtheme: 'tribal', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-013',
    title: 'Polifoniskā arhitektūra',
    author: 'Paul Klee',
    year: '1930',
    technique: 'Papīrs, jaukta tehnika',
    width: 0.40, height: 0.40, weight: 4.8, depth: 0.04, elevation: 1.40,
    theme: 'constructivist', subtheme: 'polyphony', frame: 'gallery_white', hasMat: true
  },
  {
    invNo: 'ASN-014',
    title: 'Mazie pasauļu fragmenti IV',
    author: 'Wassily Kandinsky',
    year: '1922',
    technique: 'Papīrs, krāsu litogrāfija',
    width: 0.50, height: 0.60, weight: 7.0, depth: 0.05, elevation: 1.30,
    theme: 'constructivist', subtheme: 'cosmic', frame: 'modern_black', hasMat: true
  },
  {
    invNo: 'ASN-015',
    title: 'Kalpotājs ar zelta zivi',
    author: 'Ilmārs Blumbergs',
    year: '1993',
    technique: 'Papīrs, sietspiede, akrils',
    width: 0.60, height: 0.50, weight: 8.2, depth: 0.06, elevation: 1.30,
    theme: 'minimalist', subtheme: 'gold_black', frame: 'modern_black', hasMat: true
  },
  {
    invNo: 'ASN-016',
    title: 'Kluss rīts darbnīcā',
    author: 'Bruno Vasiļevskis',
    year: '1976',
    technique: 'Kartons, eļļa',
    width: 0.38, height: 0.48, weight: 5.8, depth: 0.05, elevation: 1.40,
    theme: 'modernist', subtheme: 'still_life', frame: 'baltic_oak', hasMat: false
  },
  {
    invNo: 'ASN-017',
    title: 'Okeāna virsma IV',
    author: 'Vija Celmiņa',
    year: '1973',
    technique: 'Papīrs, grafīts',
    width: 0.48, height: 0.38, weight: 4.6, depth: 0.04, elevation: 1.50,
    theme: 'minimalist', subtheme: 'waves', frame: 'silver_aluminum', hasMat: true
  },
  {
    invNo: 'ASN-018',
    title: 'Pop-art variācija ar ziedu',
    author: 'Henrihs Vorkals',
    year: '1982',
    technique: 'Papīrs, sietspiede',
    width: 0.55, height: 0.55, weight: 7.8, depth: 0.05, elevation: 1.30,
    theme: 'constructivist', subtheme: 'popart', frame: 'silver_aluminum', hasMat: true
  },
  {
    invNo: 'ASN-019',
    title: 'Krusta motīvs un zelta lauks',
    author: 'Boriss Bērziņš',
    year: '1985',
    technique: 'Papīrs, zelta lapiņas, tuša',
    width: 0.32, height: 0.42, weight: 4.0, depth: 0.04, elevation: 1.40,
    theme: 'modernist', subtheme: 'gold_field', frame: 'antique_gold', hasMat: true
  },
  {
    invNo: 'ASN-020',
    title: 'Parīzes bulvāris lietū',
    author: 'Ludolfs Liberts',
    year: '1938',
    technique: 'Kartons, eļļa, biezs stikls',
    width: 0.60, height: 0.60, weight: 11.5, depth: 0.08, elevation: 1.30,
    theme: 'landscape', subtheme: 'city_rain', frame: 'antique_gold', hasMat: false
  },

  // --- GRUPA 2: Vidēja izmēra klasiskās gleznas (0.80 - 1.40 m, 18.0 - 52.0 kg, h = 1.00 - 1.30 m) ---
  {
    invNo: 'ASN-021',
    title: 'Pavasara ūdeņi (Martā)',
    author: 'Vilhelms Purvītis',
    year: '1910',
    technique: 'Audekls, eļļa',
    width: 1.20, height: 0.90, weight: 28.0, depth: 0.08, elevation: 1.20,
    theme: 'landscape', subtheme: 'spring_floods', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-022',
    title: 'Ziemas ainava ar sarmu',
    author: 'Vilhelms Purvītis',
    year: '1914',
    technique: 'Audekls, eļļa',
    width: 1.40, height: 1.00, weight: 36.0, depth: 0.08, elevation: 1.10,
    theme: 'landscape', subtheme: 'winter_frost', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-023',
    title: 'No baznīcas',
    author: 'Janis Rozentāls',
    year: '1894',
    technique: 'Audekls, eļļa',
    width: 1.10, height: 1.40, weight: 38.0, depth: 0.08, elevation: 1.10,
    theme: 'modernist', subtheme: 'figurative', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-024',
    title: 'Mākslinieka darbnīcā',
    author: 'Janis Rozentāls',
    year: '1908',
    technique: 'Audekls, eļļa',
    width: 1.00, height: 1.20, weight: 32.0, depth: 0.08, elevation: 1.20,
    theme: 'modernist', subtheme: 'interior', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-025',
    title: 'Tirgus Jelgavā',
    author: 'Johans Valters',
    year: '1897',
    technique: 'Audekls, eļļa',
    width: 1.30, height: 0.95, weight: 30.0, depth: 0.08, elevation: 1.10,
    theme: 'landscape', subtheme: 'market', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-026',
    title: 'Ziedošās pļavas',
    author: 'Voldemārs Matvejs',
    year: '1911',
    technique: 'Audekls, eļļa',
    width: 0.90, height: 1.10, weight: 22.0, depth: 0.07, elevation: 1.20,
    theme: 'landscape', subtheme: 'meadow', frame: 'baltic_oak', hasMat: false
  },
  {
    invNo: 'ASN-027',
    title: 'Bēgļi',
    author: 'Jēkabs Kazaks',
    year: '1917',
    technique: 'Audekls, eļļa',
    width: 1.20, height: 1.20, weight: 35.0, depth: 0.08, elevation: 1.10,
    theme: 'modernist', subtheme: 'dramatic', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-028',
    title: 'Cilvēks, kas ieiet istabā',
    author: 'Niklāvs Strunke',
    year: '1927',
    technique: 'Audekls, eļļa',
    width: 0.85, height: 1.15, weight: 26.0, depth: 0.07, elevation: 1.20,
    theme: 'constructivist', subtheme: 'metaphysical', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-029',
    title: 'Krogs ar muzikantiem',
    author: 'Romans Suta',
    year: '1920',
    technique: 'Audekls, eļļa',
    width: 1.05, height: 0.85, weight: 24.0, depth: 0.07, elevation: 1.20,
    theme: 'modernist', subtheme: 'cubist', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-030',
    title: 'Baltā un melnā',
    author: 'Aleksandra Beļcova',
    year: '1925',
    technique: 'Audekls, eļļa',
    width: 1.00, height: 1.30, weight: 34.0, depth: 0.08, elevation: 1.10,
    theme: 'modernist', subtheme: 'art_deco', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-031',
    title: 'Sieviete ar krūzi',
    author: 'Valdemārs Tone',
    year: '1928',
    technique: 'Audekls, eļļa',
    width: 0.95, height: 1.20, weight: 27.0, depth: 0.07, elevation: 1.20,
    theme: 'modernist', subtheme: 'portrait', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-032',
    title: 'Daugavmalas ainava',
    author: 'Konrāds Ubāns',
    year: '1937',
    technique: 'Audekls, eļļa',
    width: 1.35, height: 0.90, weight: 33.0, depth: 0.08, elevation: 1.10,
    theme: 'landscape', subtheme: 'river_valley', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-033',
    title: 'Klusā daba ar ceriņiem',
    author: 'Leo Svemps',
    year: '1955',
    technique: 'Audekls, eļļa',
    width: 1.15, height: 0.95, weight: 29.0, depth: 0.08, elevation: 1.20,
    theme: 'modernist', subtheme: 'rich_color', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-034',
    title: 'Lauku darbi vakarā',
    author: 'Ģederts Eliass',
    year: '1930',
    technique: 'Audekls, eļļa',
    width: 1.40, height: 1.10, weight: 42.0, depth: 0.09, elevation: 1.10,
    theme: 'modernist', subtheme: 'fauvist', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-035',
    title: 'Venēcijas gondolas saulrietā',
    author: 'Ludolfs Liberts',
    year: '1935',
    technique: 'Audekls, eļļa',
    width: 1.25, height: 1.05, weight: 37.0, depth: 0.08, elevation: 1.10,
    theme: 'landscape', subtheme: 'sunset_water', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-036',
    title: 'Brīvības vēsma',
    author: 'Jānis Pauļuks',
    year: '1947',
    technique: 'Audekls, eļļa',
    width: 1.10, height: 1.30, weight: 36.0, depth: 0.08, elevation: 1.10,
    theme: 'colorfield', subtheme: 'expressive', frame: 'baltic_oak', hasMat: false
  },
  {
    invNo: 'ASN-037',
    title: 'Felicita ar ziediem',
    author: 'Jānis Pauļuks',
    year: '1958',
    technique: 'Audekls, eļļa',
    width: 0.90, height: 1.20, weight: 28.0, depth: 0.07, elevation: 1.20,
    theme: 'colorfield', subtheme: 'dynamic', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-038',
    title: 'Tautas dziesma',
    author: 'Džemma Skulme',
    year: '1969',
    technique: 'Audekls, eļļa',
    width: 1.20, height: 1.20, weight: 38.0, depth: 0.08, elevation: 1.10,
    theme: 'modernist', subtheme: 'monumental', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-039',
    title: 'Kompozīcija ar vertikālēm',
    author: 'Ojārs Ābols',
    year: '1972',
    technique: 'Audekls, akrils, reljefs',
    width: 1.00, height: 1.40, weight: 46.0, depth: 0.10, elevation: 1.10,
    theme: 'constructivist', subtheme: 'verticals', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-040',
    title: 'Pelēkā zivs uz dēļa',
    author: 'Boriss Bērziņš',
    year: '1978',
    technique: 'Kartons uz koka paneļa, eļļa',
    width: 0.85, height: 1.05, weight: 34.0, depth: 0.08, elevation: 1.20,
    theme: 'modernist', subtheme: 'textured', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-041',
    title: 'Baltais galds ar traukiem',
    author: 'Bruno Vasiļevskis',
    year: '1979',
    technique: 'Audekls, eļļa',
    width: 1.10, height: 0.80, weight: 22.0, depth: 0.06, elevation: 1.30,
    theme: 'minimalist', subtheme: 'still_life', frame: 'gallery_white', hasMat: false
  },
  {
    invNo: 'ASN-042',
    title: 'Sapnis par bronzas jātnieku',
    author: 'Miervaldis Polis',
    year: '1983',
    technique: 'Audekls, eļļa',
    width: 1.30, height: 1.00, weight: 33.0, depth: 0.08, elevation: 1.20,
    theme: 'modernist', subtheme: 'photorealism', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-043',
    title: 'Lietaina Rīgas iela',
    author: 'Līga Purmale',
    year: '1980',
    technique: 'Audekls, eļļa',
    width: 1.20, height: 0.95, weight: 29.0, depth: 0.07, elevation: 1.20,
    theme: 'landscape', subtheme: 'city_reflections', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-044',
    title: 'Vakara serenāde',
    author: 'Juris Jurjāns',
    year: '1988',
    technique: 'Audekls, eļļa',
    width: 1.05, height: 1.25, weight: 31.0, depth: 0.08, elevation: 1.10,
    theme: 'colorfield', subtheme: 'carnival', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-045',
    title: 'Džungļu sonāte',
    author: 'Maija Tabaka',
    year: '1981',
    technique: 'Audekls, eļļa',
    width: 1.40, height: 1.20, weight: 48.0, depth: 0.09, elevation: 1.00,
    theme: 'modernist', subtheme: 'baroque_pop', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-046',
    title: 'Sarkanā karaliene',
    author: 'Aija Zariņa',
    year: '1989',
    technique: 'Audekls, eļļa',
    width: 1.25, height: 1.25, weight: 35.0, depth: 0.08, elevation: 1.10,
    theme: 'modernist', subtheme: 'neo_expression', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-047',
    title: 'Klusā klātbūtne',
    author: 'Ieva Iltnere',
    year: '1994',
    technique: 'Audekls, eļļa, pigments',
    width: 1.15, height: 1.35, weight: 44.0, depth: 0.08, elevation: 1.10,
    theme: 'minimalist', subtheme: 'meditative', frame: 'baltic_oak', hasMat: false
  },
  {
    invNo: 'ASN-048',
    title: 'Dzeltenā zīme kosmosā',
    author: 'Jānis Mitrēvics',
    year: '1991',
    technique: 'Audekls, jaukta tehnika',
    width: 1.30, height: 1.10, weight: 39.0, depth: 0.08, elevation: 1.10,
    theme: 'constructivist', subtheme: 'yellow_symbol', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-049',
    title: 'Ziemeļu saule pār mežu',
    author: 'Kristaps Ģelzis',
    year: '2001',
    technique: 'Polietilēns, akrils uz koka',
    width: 1.00, height: 1.35, weight: 32.0, depth: 0.07, elevation: 1.10,
    theme: 'minimalist', subtheme: 'luminous', frame: 'silver_aluminum', hasMat: false
  },
  {
    invNo: 'ASN-050',
    title: 'Gājējs rīta miglā',
    author: 'Kaspars Zariņš',
    year: '1998',
    technique: 'Audekls, eļļa',
    width: 1.20, height: 1.00, weight: 30.0, depth: 0.08, elevation: 1.20,
    theme: 'landscape', subtheme: 'fog', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-051',
    title: 'Untitled (Yellow and Blue)',
    author: 'Mark Rothko',
    year: '1954',
    technique: 'Audekls, eļļa',
    width: 1.15, height: 1.40, weight: 40.0, depth: 0.08, elevation: 1.10,
    theme: 'colorfield', subtheme: 'rothko_yb', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-052',
    title: 'Kompozīcija ar sarkanu, zilu un dzeltenu',
    author: 'Piet Mondrian',
    year: '1929',
    technique: 'Audekls, eļļa',
    width: 0.80, height: 0.80, weight: 18.0, depth: 0.06, elevation: 1.30,
    theme: 'constructivist', subtheme: 'mondrian', frame: 'gallery_white', hasMat: false
  },
  {
    invNo: 'ASN-053',
    title: 'Dinamiskais supremātisms Nr. 57',
    author: 'Kazimir Malevich',
    year: '1916',
    technique: 'Audekls, eļļa',
    width: 1.00, height: 1.00, weight: 25.0, depth: 0.07, elevation: 1.20,
    theme: 'constructivist', subtheme: 'suprematism', frame: 'gallery_white', hasMat: false
  },
  {
    invNo: 'ASN-054',
    title: 'Improvizācija 28',
    author: 'Wassily Kandinsky',
    year: '1912',
    technique: 'Audekls, eļļa',
    width: 1.25, height: 1.10, weight: 33.0, depth: 0.08, elevation: 1.10,
    theme: 'colorfield', subtheme: 'kandinsky', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-055',
    title: 'Proun 19D (Telpiskais vektors)',
    author: 'El Lissitzky',
    year: '1922',
    technique: 'Audekls, kolāža, eļļa',
    width: 0.90, height: 1.25, weight: 28.0, depth: 0.07, elevation: 1.20,
    theme: 'constructivist', subtheme: 'proun', frame: 'silver_aluminum', hasMat: false
  },
  {
    invNo: 'ASN-056',
    title: 'Mīlestības valoda',
    author: 'Sarmīte Māliņa',
    year: '2008',
    technique: 'Koka kārba, laka, emalja',
    width: 0.85, height: 0.85, weight: 26.0, depth: 0.08, elevation: 1.30,
    theme: 'minimalist', subtheme: 'red_lacquer', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-057',
    title: 'Zemes slāņi un saknes',
    author: 'Andris Eglītis',
    year: '2012',
    technique: 'Audekls, māls, eļļa',
    width: 1.35, height: 1.15, weight: 52.0, depth: 0.11, elevation: 1.00,
    theme: 'modernist', subtheme: 'earth_matter', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-058',
    title: 'Rīts ar ābolu un grāmatu',
    author: 'Bruno Vasiļevskis',
    year: '1981',
    technique: 'Audekls, eļļa',
    width: 0.80, height: 1.00, weight: 20.0, depth: 0.06, elevation: 1.20,
    theme: 'minimalist', subtheme: 'still_life', frame: 'baltic_oak', hasMat: false
  },
  {
    invNo: 'ASN-059',
    title: 'Rudenī pie Gaujas',
    author: 'Vilhelms Purvītis',
    year: '1928',
    technique: 'Audekls, eļļa',
    width: 1.40, height: 0.90, weight: 31.0, depth: 0.08, elevation: 1.20,
    theme: 'landscape', subtheme: 'autumn_gold', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-060',
    title: 'Princese ar pērtiķi',
    author: 'Janis Rozentāls',
    year: '1913',
    technique: 'Audekls, eļļa',
    width: 0.95, height: 1.35, weight: 36.0, depth: 0.08, elevation: 1.10,
    theme: 'modernist', subtheme: 'art_nouveau', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-061',
    title: 'Klintis Staburaga tuvumā',
    author: 'Konrāds Ubāns',
    year: '1939',
    technique: 'Audekls, eļļa',
    width: 1.30, height: 0.85, weight: 29.0, depth: 0.07, elevation: 1.20,
    theme: 'landscape', subtheme: 'river_cliffs', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-062',
    title: 'Zivis uz avīzes fona',
    author: 'Leo Svemps',
    year: '1960',
    technique: 'Audekls, eļļa',
    width: 1.10, height: 0.90, weight: 25.0, depth: 0.07, elevation: 1.20,
    theme: 'modernist', subtheme: 'still_life', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-063',
    title: 'Pašportrets ar melnu cepuri',
    author: 'Jānis Pauļuks',
    year: '1962',
    technique: 'Audekls, eļļa',
    width: 0.90, height: 1.15, weight: 27.0, depth: 0.07, elevation: 1.20,
    theme: 'colorfield', subtheme: 'portrait', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-064',
    title: 'Kariatīde telpā',
    author: 'Džemma Skulme',
    year: '1982',
    technique: 'Audekls, akrils, kolāža',
    width: 1.05, height: 1.40, weight: 47.0, depth: 0.09, elevation: 1.00,
    theme: 'modernist', subtheme: 'caryatid', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-065',
    title: 'Regīnas portrets vakarkleitā',
    author: 'Maija Tabaka',
    year: '1979',
    technique: 'Audekls, eļļa',
    width: 1.20, height: 1.30, weight: 42.0, depth: 0.08, elevation: 1.10,
    theme: 'modernist', subtheme: 'baroque', frame: 'antique_gold', hasMat: false
  },

  // --- GRUPA 3: Lielformāta audekli (1.50 - 2.20 m, 46.0 - 92.0 kg, h = 0.80 - 1.10 m) ---
  {
    invNo: 'ASN-066',
    title: 'Pavasara ziemeļu elpa',
    author: 'Vilhelms Purvītis',
    year: '1930',
    technique: 'Audekls, eļļa',
    width: 1.80, height: 1.40, weight: 58.0, depth: 0.09, elevation: 1.00,
    theme: 'landscape', subtheme: 'spring_floods', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-067',
    title: 'Mūžīgais miers (Ainava ar ezeru)',
    author: 'Vilhelms Purvītis',
    year: '1925',
    technique: 'Audekls, eļļa',
    width: 2.00, height: 1.50, weight: 68.0, depth: 0.10, elevation: 0.90,
    theme: 'landscape', subtheme: 'sunset_water', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-068',
    title: 'Nāve un meitene',
    author: 'Janis Rozentāls',
    year: '1907',
    technique: 'Audekls, eļļa',
    width: 1.50, height: 1.80, weight: 62.0, depth: 0.09, elevation: 1.00,
    theme: 'modernist', subtheme: 'symbolism', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-069',
    title: 'Peldētāji zēni saulrietā',
    author: 'Johans Valters',
    year: '1900',
    technique: 'Audekls, eļļa',
    width: 1.70, height: 1.30, weight: 52.0, depth: 0.09, elevation: 1.00,
    theme: 'landscape', subtheme: 'sunset_water', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-070',
    title: 'Rituālā ceremonija',
    author: 'Voldemārs Matvejs',
    year: '1913',
    technique: 'Audekls, eļļa',
    width: 1.60, height: 2.10, weight: 74.0, depth: 0.10, elevation: 0.90,
    theme: 'modernist', subtheme: 'tribal', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-071',
    title: 'Pusdienas laiks druvā',
    author: 'Ģederts Eliass',
    year: '1935',
    technique: 'Audekls, eļļa',
    width: 2.10, height: 1.60, weight: 70.0, depth: 0.10, elevation: 0.90,
    theme: 'modernist', subtheme: 'fauvist', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-072',
    title: 'Lielā Daugava vējā',
    author: 'Jānis Pauļuks',
    year: '1953',
    technique: 'Audekls, eļļa',
    width: 1.90, height: 1.50, weight: 64.0, depth: 0.09, elevation: 1.00,
    theme: 'colorfield', subtheme: 'expressive', frame: 'baltic_oak', hasMat: false
  },
  {
    invNo: 'ASN-073',
    title: 'Paaudzes',
    author: 'Džemma Skulme',
    year: '1975',
    technique: 'Audekls, akrils, jaukta tehnika',
    width: 1.80, height: 1.80, weight: 66.0, depth: 0.10, elevation: 0.90,
    theme: 'modernist', subtheme: 'monumental', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-074',
    title: 'Zemes elpa un magmatiskais spēks',
    author: 'Ojārs Ābols',
    year: '1976',
    technique: 'Audekls, jaukta tehnika, smiltis, reljefs',
    width: 1.70, height: 2.00, weight: 82.0, depth: 0.12, elevation: 0.90,
    theme: 'modernist', subtheme: 'earth_matter', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-075',
    title: 'Siena pļāvēji pusdienā',
    author: 'Boriss Bērziņš',
    year: '1982',
    technique: 'Koka masīvs panelis, eļļa, zelta grunts',
    width: 1.60, height: 1.60, weight: 76.0, depth: 0.11, elevation: 1.00,
    theme: 'modernist', subtheme: 'textured', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-076',
    title: 'Lūgšana par mieru',
    author: 'Ilmārs Blumbergs',
    year: '1998',
    technique: 'Audekls, akrils, ogle, zelts',
    width: 2.20, height: 1.70, weight: 78.0, depth: 0.10, elevation: 0.80,
    theme: 'minimalist', subtheme: 'gold_black', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-077',
    title: 'Kāzas Rundāles pilī',
    author: 'Maija Tabaka',
    year: '1986',
    technique: 'Audekls, eļļa, masīvs baroka rāmis',
    width: 2.10, height: 1.80, weight: 85.0, depth: 0.12, elevation: 0.80,
    theme: 'modernist', subtheme: 'baroque', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-078',
    title: 'Koloristiskā ilūzija telpā',
    author: 'Miervaldis Polis',
    year: '1989',
    technique: 'Audekls, eļļa',
    width: 1.90, height: 1.90, weight: 65.0, depth: 0.09, elevation: 0.90,
    theme: 'modernist', subtheme: 'photorealism', frame: 'silver_aluminum', hasMat: false
  },
  {
    invNo: 'ASN-079',
    title: 'Nakts gaisma pār Rīgu',
    author: 'Līga Purmale',
    year: '1992',
    technique: 'Audekls, eļļa',
    width: 2.00, height: 1.40, weight: 56.0, depth: 0.09, elevation: 1.00,
    theme: 'landscape', subtheme: 'city_reflections', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-080',
    title: 'Vasaras pilnbrieds un ziedi',
    author: 'Juris Jurjāns',
    year: '1995',
    technique: 'Audekls, eļļa',
    width: 1.80, height: 2.10, weight: 75.0, depth: 0.10, elevation: 0.80,
    theme: 'colorfield', subtheme: 'carnival', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-081',
    title: 'Monumentālā kompozīcija VIII',
    author: 'Henrihs Vorkals',
    year: '1987',
    technique: 'Audekls, sietspiede, akrils',
    width: 2.20, height: 1.50, weight: 60.0, depth: 0.09, elevation: 0.90,
    theme: 'constructivist', subtheme: 'popart', frame: 'silver_aluminum', hasMat: false
  },
  {
    invNo: 'ASN-082',
    title: 'Eiropas nolaupīšana',
    author: 'Aija Zariņa',
    year: '1990',
    technique: 'Audekls, eļļa',
    width: 2.00, height: 2.00, weight: 72.0, depth: 0.10, elevation: 0.90,
    theme: 'modernist', subtheme: 'neo_expression', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-083',
    title: 'Gaisa spēki un zilā telpa',
    author: 'Kristaps Ģelzis',
    year: '2007',
    technique: 'Pigmenta druka uz dibond alumīnija',
    width: 1.70, height: 1.60, weight: 48.0, depth: 0.06, elevation: 1.00,
    theme: 'minimalist', subtheme: 'luminous', frame: 'silver_aluminum', hasMat: false
  },
  {
    invNo: 'ASN-084',
    title: 'Ierakumi mežā (Zemes konstrukcija)',
    author: 'Andris Eglītis',
    year: '2015',
    technique: 'Audekls, zeme, koks, eļļa',
    width: 2.10, height: 1.50, weight: 88.0, depth: 0.12, elevation: 0.90,
    theme: 'modernist', subtheme: 'earth_matter', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-085',
    title: 'Bābele',
    author: 'Ieva Iltnere',
    year: '2004',
    technique: 'Audekls, eļļa',
    width: 1.80, height: 1.60, weight: 55.0, depth: 0.09, elevation: 1.00,
    theme: 'minimalist', subtheme: 'meditative', frame: 'gallery_white', hasMat: false
  },
  {
    invNo: 'ASN-086',
    title: 'No. 14 (White and Greens on Blue)',
    author: 'Mark Rothko',
    year: '1957',
    technique: 'Audekls, eļļa',
    width: 1.50, height: 2.20, weight: 64.0, depth: 0.09, elevation: 0.80,
    theme: 'colorfield', subtheme: 'rothko_gb', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-087',
    title: 'Supremātisms (Balts uz balta)',
    author: 'Kazimir Malevich',
    year: '1918',
    technique: 'Audekls, eļļa',
    width: 1.50, height: 1.50, weight: 46.0, depth: 0.08, elevation: 1.10,
    theme: 'constructivist', subtheme: 'white_on_white', frame: 'gallery_white', hasMat: false
  },
  {
    invNo: 'ASN-088',
    title: 'Kompozīcija VIII',
    author: 'Wassily Kandinsky',
    year: '1923',
    technique: 'Audekls, eļļa',
    width: 2.00, height: 1.40, weight: 58.0, depth: 0.09, elevation: 1.00,
    theme: 'constructivist', subtheme: 'kandinsky_comp', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-089',
    title: 'Lielā telpiskā konstrukcija',
    author: 'Gustavs Klucis',
    year: '1922',
    technique: 'Finieris, metāla detaļas, emalja',
    width: 1.60, height: 1.90, weight: 92.0, depth: 0.12, elevation: 0.90,
    theme: 'constructivist', subtheme: 'avantgarde', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-090',
    title: 'Nakts debesis (Zvaigžņu lauks)',
    author: 'Vija Celmiņa',
    year: '1995',
    technique: 'Audekls, eļļa',
    width: 1.90, height: 2.10, weight: 70.0, depth: 0.09, elevation: 0.80,
    theme: 'minimalist', subtheme: 'stars', frame: 'silver_aluminum', hasMat: false
  },

  // --- GRUPA 4: Monumentāli darbi / diptiki / triptiki (2.20 - 2.80 m, 95.0 - 140.0 kg, h = 0.80 - 0.90 m) ---
  {
    invNo: 'ASN-091',
    title: 'Monumentālā pavasara ainava (Panorāma)',
    author: 'Vilhelms Purvītis',
    year: '1935',
    technique: 'Audekls, eļļa, masīvs ozola dubultrāmis',
    width: 2.60, height: 1.80, weight: 115.0, depth: 0.12, elevation: 0.80,
    theme: 'landscape', subtheme: 'spring_floods', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-092',
    title: 'Zemgales lauku epopeja (Triptiks)',
    author: 'Ģederts Eliass',
    year: '1938',
    technique: 'Koka trīsdaļu panelis, eļļa',
    width: 2.80, height: 1.90, weight: 135.0, depth: 0.12, elevation: 0.80,
    theme: 'modernist', subtheme: 'fauvist', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-093',
    title: 'Lielā ritmiskā simfonija',
    author: 'Jānis Pauļuks',
    year: '1965',
    technique: 'Audekls, eļļa, tērauda iekšējais karkass',
    width: 2.40, height: 1.80, weight: 105.0, depth: 0.11, elevation: 0.90,
    theme: 'colorfield', subtheme: 'dynamic', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-094',
    title: 'Vēstures liecinieki (Diptiks)',
    author: 'Džemma Skulme',
    year: '1985',
    technique: 'Audekls, akrils, masīvs alumīnija profils',
    width: 2.50, height: 2.00, weight: 120.0, depth: 0.11, elevation: 0.80,
    theme: 'modernist', subtheme: 'monumental', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-095',
    title: 'Tektoniskais lūzums un telpa',
    author: 'Ojārs Ābols',
    year: '1980',
    technique: 'Koka un betona kompozīcija, polimēri',
    width: 2.30, height: 2.40, weight: 140.0, depth: 0.14, elevation: 0.80,
    theme: 'modernist', subtheme: 'earth_matter', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-096',
    title: 'Ceļš uz gaismu (Monumentālais panelis)',
    author: 'Ilmārs Blumbergs',
    year: '2002',
    technique: 'Saplāksnis, jaukta tehnika, dzelzs karkass',
    width: 2.70, height: 1.80, weight: 125.0, depth: 0.12, elevation: 0.80,
    theme: 'minimalist', subtheme: 'gold_black', frame: 'modern_black', hasMat: false
  },
  {
    invNo: 'ASN-097',
    title: 'Rīgas leģenda (Diptiks)',
    author: 'Maija Tabaka',
    year: '1984',
    technique: 'Audekls, eļļa, masīvkoka profils',
    width: 2.60, height: 2.20, weight: 130.0, depth: 0.12, elevation: 0.80,
    theme: 'modernist', subtheme: 'baroque', frame: 'antique_gold', hasMat: false
  },
  {
    invNo: 'ASN-098',
    title: 'Latvijas ainava 360°',
    author: 'Kristaps Ģelzis',
    year: '2011',
    technique: 'Lielformāta dubultpanelis, luminiscējoša krāsa, dibonds',
    width: 2.80, height: 2.20, weight: 110.0, depth: 0.10, elevation: 0.80,
    theme: 'minimalist', subtheme: 'luminous', frame: 'silver_aluminum', hasMat: false
  },
  {
    invNo: 'ASN-099',
    title: 'Ziemeļu meža katedrāle (Diptiks)',
    author: 'Andris Eglītis',
    year: '2018',
    technique: 'Audekls, ozolkoka karkass, dabīgie pigmenti',
    width: 2.50, height: 2.20, weight: 138.0, depth: 0.13, elevation: 0.80,
    theme: 'modernist', subtheme: 'earth_matter', frame: 'dark_walnut', hasMat: false
  },
  {
    invNo: 'ASN-100',
    title: 'Monumental Black on Maroon (Mural Diptych)',
    author: 'Mark Rothko',
    year: '1958',
    technique: 'Audekls, eļļa, pastiprināts tērauda apakšrāmis',
    width: 2.40, height: 2.40, weight: 95.0, depth: 0.11, elevation: 0.80,
    theme: 'colorfield', subtheme: 'rothko_maroon', frame: 'modern_black', hasMat: false
  }
];

// ============================================================================
// 2. PNG KODĒTĀJS (TĪRS NODE.JS ZLIB + CRC32)
// ============================================================================
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  crcTable[n] = c >>> 0;
}
function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function makeChunk(type, data) {
  const buf = Buffer.alloc(12 + data.length);
  buf.writeUInt32BE(data.length, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  buf.writeUInt32BE(crc32(buf.subarray(4, 8 + data.length)), 8 + data.length);
  return buf;
}

// ============================================================================
// 3. BITMAP FONT TABULA (ASCII + LATVIEŠU DIAPAZONS)
// ============================================================================
const FONT_5X7 = {
  ' ': [0x00,0x00,0x00,0x00,0x00,0x00,0x00],
  '0': [0x0E,0x11,0x13,0x15,0x19,0x11,0x0E],
  '1': [0x04,0x0C,0x04,0x04,0x04,0x04,0x0E],
  '2': [0x0E,0x11,0x01,0x02,0x04,0x08,0x1F],
  '3': [0x1E,0x01,0x01,0x0E,0x01,0x01,0x1E],
  '4': [0x02,0x06,0x0A,0x12,0x1F,0x02,0x02],
  '5': [0x1F,0x10,0x1E,0x01,0x01,0x11,0x0E],
  '6': [0x06,0x08,0x10,0x1E,0x11,0x11,0x0E],
  '7': [0x1F,0x01,0x02,0x04,0x08,0x08,0x08],
  '8': [0x0E,0x11,0x11,0x0E,0x11,0x11,0x0E],
  '9': [0x0E,0x11,0x11,0x0F,0x01,0x02,0x0C],
  'A': [0x0E,0x11,0x11,0x1F,0x11,0x11,0x11],
  'B': [0x1E,0x11,0x11,0x1E,0x11,0x11,0x1E],
  'C': [0x0E,0x11,0x10,0x10,0x10,0x11,0x0E],
  'D': [0x1C,0x12,0x11,0x11,0x11,0x12,0x1C],
  'E': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x1F],
  'F': [0x1F,0x10,0x10,0x1E,0x10,0x10,0x10],
  'G': [0x0E,0x11,0x10,0x17,0x11,0x11,0x0F],
  'H': [0x11,0x11,0x11,0x1F,0x11,0x11,0x11],
  'I': [0x0E,0x04,0x04,0x04,0x04,0x04,0x0E],
  'J': [0x07,0x02,0x02,0x02,0x02,0x12,0x0C],
  'K': [0x11,0x12,0x14,0x18,0x14,0x12,0x11],
  'L': [0x10,0x10,0x10,0x10,0x10,0x10,0x1F],
  'M': [0x11,0x1B,0x15,0x15,0x11,0x11,0x11],
  'N': [0x11,0x11,0x19,0x15,0x13,0x11,0x11],
  'O': [0x0E,0x11,0x11,0x11,0x11,0x11,0x0E],
  'P': [0x1E,0x11,0x11,0x1E,0x10,0x10,0x10],
  'Q': [0x0E,0x11,0x11,0x11,0x15,0x12,0x0D],
  'R': [0x1E,0x11,0x11,0x1E,0x14,0x12,0x11],
  'S': [0x0E,0x11,0x10,0x0E,0x01,0x11,0x0E],
  'T': [0x1F,0x04,0x04,0x04,0x04,0x04,0x04],
  'U': [0x11,0x11,0x11,0x11,0x11,0x11,0x0E],
  'V': [0x11,0x11,0x11,0x11,0x11,0x0A,0x04],
  'W': [0x11,0x11,0x11,0x15,0x15,0x1B,0x11],
  'X': [0x11,0x11,0x0A,0x04,0x0A,0x11,0x11],
  'Y': [0x11,0x11,0x0A,0x04,0x04,0x04,0x04],
  'Z': [0x1F,0x01,0x02,0x04,0x08,0x10,0x1F],
  '-': [0x00,0x00,0x00,0x1F,0x00,0x00,0x00],
  '.': [0x00,0x00,0x00,0x00,0x00,0x0C,0x0C],
  ',': [0x00,0x00,0x00,0x00,0x0C,0x0C,0x08],
  ':': [0x00,0x0C,0x0C,0x00,0x0C,0x0C,0x00],
  '(': [0x02,0x04,0x08,0x08,0x08,0x04,0x02],
  ')': [0x08,0x04,0x02,0x02,0x02,0x04,0x08],
  '[': [0x0E,0x08,0x08,0x08,0x08,0x08,0x0E],
  ']': [0x0E,0x02,0x02,0x02,0x02,0x02,0x0E],
  '/': [0x01,0x02,0x04,0x08,0x10,0x00,0x00],
  'X': [0x11,0x0A,0x04,0x04,0x0A,0x11,0x00],
  '·': [0x00,0x00,0x0C,0x0C,0x00,0x00,0x00],
  '«': [0x00,0x05,0x0A,0x14,0x0A,0x05,0x00],
  '»': [0x00,0x14,0x0A,0x05,0x0A,0x14,0x00],
  '|': [0x04,0x04,0x04,0x04,0x04,0x04,0x04],
  '=': [0x00,0x1F,0x00,0x1F,0x00,0x00,0x00],
  '#': [0x0A,0x1F,0x0A,0x0A,0x1F,0x0A,0x00]
};

// Transliterēšana vai glifu kartēšana latviešu burtiem
const LV_MAP = {
  'Ā': 'A', 'ā': 'A', 'Č': 'C', 'č': 'C', 'Ē': 'E', 'ē': 'E',
  'Ģ': 'G', 'ģ': 'G', 'Ī': 'I', 'ī': 'I', 'Ķ': 'K', 'ķ': 'K',
  'Ļ': 'L', 'ļ': 'L', 'Ņ': 'N', 'ņ': 'N', 'Š': 'S', 'š': 'S',
  'Ū': 'U', 'ū': 'U', 'Ž': 'Z', 'ž': 'Z', '×': 'X'
};

// ============================================================================
// 4. CANVASS RENDERING UN PROCEDURĀLIE ZĪMĒŠANAS INSTRUMENTI
// ============================================================================
class ArtCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.pixels = Buffer.alloc(w * h * 3);
  }

  setPixel(x, y, r, g, b) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const idx = (y * this.w + x) * 3;
    this.pixels[idx] = Math.max(0, Math.min(255, Math.round(r)));
    this.pixels[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
    this.pixels[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }

  blendPixel(x, y, r, g, b, a) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h || a <= 0) return;
    const idx = (y * this.w + x) * 3;
    const curR = this.pixels[idx];
    const curG = this.pixels[idx + 1];
    const curB = this.pixels[idx + 2];
    this.pixels[idx] = Math.round(curR * (1 - a) + r * a);
    this.pixels[idx + 1] = Math.round(curG * (1 - a) + g * a);
    this.pixels[idx + 2] = Math.round(curB * (1 - a) + b * a);
  }

  fillRect(x0, y0, rw, rh, r, g, b, a = 1.0) {
    const x1 = Math.min(this.w, Math.max(0, Math.round(x0 + rw)));
    const y1 = Math.min(this.h, Math.max(0, Math.round(y0 + rh)));
    const sx = Math.max(0, Math.round(x0));
    const sy = Math.max(0, Math.round(y0));
    for (let y = sy; y < y1; y++) {
      for (let x = sx; x < x1; x++) {
        if (a >= 1.0) this.setPixel(x, y, r, g, b);
        else this.blendPixel(x, y, r, g, b, a);
      }
    }
  }

  fillGradientV(x0, y0, rw, rh, c1, c2) {
    const x1 = Math.min(this.w, Math.max(0, Math.round(x0 + rw)));
    const y1 = Math.min(this.h, Math.max(0, Math.round(y0 + rh)));
    const sx = Math.max(0, Math.round(x0));
    const sy = Math.max(0, Math.round(y0));
    const totalH = Math.max(1, rh);
    for (let y = sy; y < y1; y++) {
      const t = (y - y0) / totalH;
      const r = c1[0] + (c2[0] - c1[0]) * t;
      const g = c1[1] + (c2[1] - c1[1]) * t;
      const b = c1[2] + (c2[2] - c1[2]) * t;
      for (let x = sx; x < x1; x++) {
        this.setPixel(x, y, r, g, b);
      }
    }
  }

  fillCircle(cx, cy, radius, r, g, b, a = 1.0) {
    const r2 = radius * radius;
    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(this.w - 1, Math.ceil(cx + radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const y1 = Math.min(this.h - 1, Math.ceil(cy + radius));
    for (let y = y0; y <= y1; y++) {
      const dy = y - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r2) {
          const edgeAlpha = Math.min(1.0, Math.max(0.0, (radius - Math.sqrt(d2)) + 0.5)) * a;
          this.blendPixel(x, y, r, g, b, edgeAlpha);
        }
      }
    }
  }

  drawRotatedBar(cx, cy, len, thickness, angleRad, r, g, b, a = 1.0) {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const halfL = len / 2;
    const halfT = thickness / 2;
    const bboxRadius = Math.ceil(Math.sqrt(halfL * halfL + halfT * halfT));
    const x0 = Math.max(0, Math.floor(cx - bboxRadius));
    const x1 = Math.min(this.w - 1, Math.ceil(cx + bboxRadius));
    const y0 = Math.max(0, Math.floor(cy - bboxRadius));
    const y1 = Math.min(this.h - 1, Math.ceil(cy + bboxRadius));

    for (let y = y0; y <= y1; y++) {
      const dy = y - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx;
        const lx = dx * cos + dy * sin;
        const ly = -dx * sin + dy * cos;
        if (Math.abs(lx) <= halfL && Math.abs(ly) <= halfT) {
          this.blendPixel(x, y, r, g, b, a);
        }
      }
    }
  }

  drawChar(ch, x0, y0, scale, r, g, b) {
    const mapped = LV_MAP[ch] || ch.toUpperCase();
    const glyph = FONT_5X7[mapped] || FONT_5X7[' '];
    for (let row = 0; row < 7; row++) {
      const line = glyph[row];
      for (let col = 0; col < 5; col++) {
        if ((line >> (4 - col)) & 1) {
          this.fillRect(x0 + col * scale, y0 + row * scale, scale, scale, r, g, b);
        }
      }
    }
  }

  drawText(text, x, y, scale = 2, r = 255, g = 255, b = 255, withShadow = true) {
    let curX = x;
    const charW = (5 + 1) * scale;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (withShadow) {
        this.drawChar(ch, curX + 1, y + 1, scale, 10, 10, 12);
      }
      this.drawChar(ch, curX, y, scale, r, g, b);
      curX += charW;
    }
    return curX;
  }

  applyTextureNoise(intensity = 12) {
    // Viegls audekla lina diegu graudainums
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const idx = (y * this.w + x) * 3;
        const noise = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * intensity - (intensity / 2);
        this.pixels[idx] = Math.max(0, Math.min(255, this.pixels[idx] + noise));
        this.pixels[idx + 1] = Math.max(0, Math.min(255, this.pixels[idx + 1] + noise));
        this.pixels[idx + 2] = Math.max(0, Math.min(255, this.pixels[idx + 2] + noise));
      }
    }
  }

  toPngBuffer() {
    const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(this.w, 0);
    ihdrData.writeUInt32BE(this.h, 4);
    ihdrData[8] = 8; ihdrData[9] = 2; // RGB
    const ihdr = makeChunk('IHDR', ihdrData);

    const raw = Buffer.alloc(this.h * (1 + this.w * 3));
    let p = 0;
    let s = 0;
    for (let y = 0; y < this.h; y++) {
      raw[p++] = 0;
      this.pixels.copy(raw, p, s, s + this.w * 3);
      p += this.w * 3;
      s += this.w * 3;
    }
    const idat = makeChunk('IDAT', zlib.deflateSync(raw, { level: 6 }));
    const iend = makeChunk('IEND', Buffer.alloc(0));
    return Buffer.concat([sig, ihdr, idat, iend]);
  }
}

// ============================================================================
// 5. PROCEDURĀLĀ MĀKSLAS DARBU UN RĀMJU ĢENERĒŠANA
// ============================================================================
function generateArtworkImage(art, targetMaxDim = 720) {
  const wMeters = art.width;
  const hMeters = art.height;
  const aspect = wMeters / hMeters;

  let imgW, imgH;
  if (aspect >= 1.0) {
    imgW = targetMaxDim;
    imgH = Math.max(160, Math.round(targetMaxDim / aspect));
  } else {
    imgH = targetMaxDim;
    imgW = Math.max(160, Math.round(targetMaxDim * aspect));
  }

  const cv = new ArtCanvas(imgW, imgH);

  // 1. Zīmējam rāmi (Frame)
  const frameThick = Math.max(12, Math.round(Math.min(imgW, imgH) * 0.045));
  let fColor, fHigh, fShad;
  switch (art.frame) {
    case 'antique_gold':
      fColor = [175, 140, 65]; fHigh = [235, 205, 110]; fShad = [95, 70, 25];
      break;
    case 'dark_walnut':
      fColor = [48, 32, 22]; fHigh = [85, 55, 38]; fShad = [24, 15, 10];
      break;
    case 'baltic_oak':
      fColor = [205, 175, 135]; fHigh = [240, 218, 185]; fShad = [140, 110, 75];
      break;
    case 'modern_black':
      fColor = [30, 32, 36]; fHigh = [75, 80, 88]; fShad = [12, 14, 16];
      break;
    case 'silver_aluminum':
      fColor = [185, 190, 195]; fHigh = [235, 238, 242]; fShad = [120, 125, 130];
      break;
    case 'gallery_white':
    default:
      fColor = [245, 245, 248]; fHigh = [255, 255, 255]; fShad = [185, 185, 192];
      break;
  }

  // Rāmja pamatne
  cv.fillRect(0, 0, imgW, imgH, fColor[0], fColor[1], fColor[2]);
  // Rāmja iekšējās un ārējās šķautnes gaisma/ēna (3D efekts)
  cv.fillRect(0, 0, imgW, 3, fHigh[0], fHigh[1], fHigh[2]);
  cv.fillRect(0, 0, 3, imgH, fHigh[0], fHigh[1], fHigh[2]);
  cv.fillRect(0, imgH - 3, imgW, 3, fShad[0], fShad[1], fShad[2]);
  cv.fillRect(imgW - 3, 0, 3, imgH, fShad[0], fShad[1], fShad[2]);

  let innerX = frameThick;
  let innerY = frameThick;
  let innerW = imgW - frameThick * 2;
  let innerH = imgH - frameThick * 2;

  // 2. Ja ir paspartū (zīmējumiem un grafikām)
  if (art.hasMat) {
    const matSize = Math.max(16, Math.round(frameThick * 1.2));
    cv.fillRect(innerX, innerY, innerW, innerH, 246, 243, 235); // Arhīva ziloņkauls
    // Paspartū iekšējās malas facete
    innerX += matSize;
    innerY += matSize;
    innerW -= matSize * 2;
    innerH -= matSize * 2;
    // Ēna ap paspartū logu
    cv.fillRect(innerX - 2, innerY - 2, innerW + 4, 2, 200, 195, 185);
    cv.fillRect(innerX - 2, innerY - 2, 2, innerH + 4, 200, 195, 185);
  }

  // 3. Zīmējam pašu mākslas darba gleznojumu
  const seed = parseInt(art.invNo.replace(/\D/g, ''), 10) || 1;

  if (art.theme === 'landscape') {
    // --- AINAVAS MOTĪVS (Purvītis / Valters / Rozentāls) ---
    let sky1, sky2, groundC, waterC;
    if (art.subtheme === 'winter_frost') {
      sky1 = [135, 165, 195]; sky2 = [225, 235, 245]; groundC = [220, 230, 242]; waterC = [60, 95, 130];
    } else if (art.subtheme === 'autumn_gold' || art.subtheme === 'autumn') {
      sky1 = [170, 180, 195]; sky2 = [230, 215, 180]; groundC = [140, 95, 45]; waterC = [75, 90, 85];
    } else if (art.subtheme === 'sunset_water') {
      sky1 = [75, 45, 85]; sky2 = [235, 130, 70]; groundC = [60, 35, 30]; waterC = [180, 85, 60];
    } else { // spring / floods
      sky1 = [150, 190, 225]; sky2 = [240, 245, 250]; groundC = [160, 175, 140]; waterC = [70, 115, 160];
    }

    const horizY = innerY + Math.round(innerH * 0.58);
    // Debesis
    cv.fillGradientV(innerX, innerY, innerW, horizY - innerY, sky1, sky2);
    // Zeme / ūdens
    cv.fillGradientV(innerX, horizY, innerW, innerY + innerH - horizY, groundC, waterC);

    // Saule / mēness
    const sunX = innerX + Math.round(innerW * (0.35 + (seed % 30) / 100));
    const sunY = innerY + Math.round(innerH * 0.38);
    cv.fillCircle(sunX, sunY, Math.round(innerH * 0.09), 255, 248, 220, 0.7);

    // Tālie meža/kalnu pakalni
    for (let x = innerX; x < innerX + innerW; x++) {
      const hillH = Math.round(Math.sin((x - innerX) * 0.02 + seed) * (innerH * 0.05) + innerH * 0.04);
      cv.fillRect(x, horizY - hillH, 1, hillH, (sky2[0] + groundC[0]) / 2, (sky2[1] + groundC[1]) / 2, (sky2[2] + groundC[2]) / 2, 0.6);
    }

    // Bērzu stumbri (Latvijas ainavas ikona)
    const treeCount = 4 + (seed % 4);
    for (let t = 0; t < treeCount; t++) {
      const tx = innerX + Math.round(innerW * (0.15 + (t * 0.2) + (seed * 7 % 13) / 100));
      const tw = Math.max(3, Math.round(innerW * 0.016));
      const th = Math.round(innerH * (0.45 + (t % 3) * 0.08));
      const ty = horizY + 15 - th;
      // Balts stumbrs
      cv.fillRect(tx, ty, tw, th, 242, 242, 240);
      // Melni mizas plankumi
      for (let b = 0; b < 6; b++) {
        const by = ty + Math.round(th * (0.2 + b * 0.13));
        cv.fillRect(tx, by, tw - 1, 2, 35, 35, 40, 0.75);
      }
    }
  } else if (art.theme === 'constructivist') {
    // --- SUPREMĀTISMS UN KONSTRUKTĪVISMS (Klucis / Malevičs / Mondrians) ---
    cv.fillRect(innerX, innerY, innerW, innerH, 240, 236, 224); // Gaišs audekls

    const cx = innerX + innerW / 2;
    const cy = innerY + innerH / 2;

    if (art.subtheme === 'mondrian') {
      // Tīrs Mondriana režģis
      const bar1X = innerX + Math.round(innerW * 0.35);
      const bar2Y = innerY + Math.round(innerH * 0.40);
      cv.fillRect(innerX, innerY, bar1X - innerX, bar2Y - innerY, 215, 45, 35); // Sarkans laukums
      cv.fillRect(bar1X, bar2Y, innerX + innerW - bar1X, innerY + innerH - bar2Y, 35, 75, 160); // Zils laukums
      cv.fillRect(innerX, innerY + Math.round(innerH * 0.75), Math.round(innerW * 0.2), innerH * 0.25, 245, 195, 30); // Dzeltens
      // Melnās režģa līnijas
      cv.fillRect(bar1X - 3, innerY, 7, innerH, 20, 20, 24);
      cv.fillRect(innerX, bar2Y - 3, innerW, 7, 20, 20, 24);
      cv.fillRect(innerX, innerY + Math.round(innerH * 0.75), innerW, 6, 20, 20, 24);
    } else {
      // Dinamiskās supremātisma diagonāles un apļi
      cv.drawRotatedBar(cx, cy, innerW * 0.85, Math.round(innerH * 0.08), 0.55, 215, 40, 30); // Sarkana sija
      cv.drawRotatedBar(cx + 20, cy - 15, innerW * 0.70, Math.round(innerH * 0.06), -0.75, 25, 25, 30); // Melna sija
      cv.drawRotatedBar(cx - 30, cy + 35, innerW * 0.55, Math.round(innerH * 0.04), 0.20, 240, 185, 35); // Dzeltena sija
      cv.fillCircle(cx - Math.round(innerW * 0.22), cy - Math.round(innerH * 0.18), Math.round(innerH * 0.14), 25, 30, 35); // Melns aplis
      cv.fillCircle(cx + Math.round(innerW * 0.25), cy + Math.round(innerH * 0.20), Math.round(innerH * 0.10), 220, 50, 40); // Sarkans aplis
    }
  } else if (art.theme === 'colorfield') {
    // --- KRĀSU LAUKU ABSTRAKCIJA (Marks Rotko / Pauļuks) ---
    let bgC, block1C, block2C;
    if (art.subtheme === 'rothko_maroon') {
      bgC = [75, 25, 35]; block1C = [35, 15, 20]; block2C = [200, 70, 40];
    } else if (art.subtheme === 'rothko_yb') {
      bgC = [240, 215, 140]; block1C = [245, 180, 25]; block2C = [40, 80, 165];
    } else if (art.subtheme === 'rothko_gb') {
      bgC = [30, 60, 110]; block1C = [235, 240, 245]; block2C = [40, 130, 95];
    } else { // expressive
      bgC = [40, 25, 55]; block1C = [225, 110, 40]; block2C = [185, 35, 55];
    }

    cv.fillRect(innerX, innerY, innerW, innerH, bgC[0], bgC[1], bgC[2]);

    // 1. Lielais krāsu bloks (augšā)
    const b1Y = innerY + Math.round(innerH * 0.10);
    const b1H = Math.round(innerH * 0.38);
    const bW = Math.round(innerW * 0.84);
    const bX = innerX + Math.round(innerW * 0.08);

    // Mīkstinātas malas (Rotko efekts)
    cv.fillRect(bX - 6, b1Y - 6, bW + 12, b1H + 12, block1C[0], block1C[1], block1C[2], 0.25);
    cv.fillRect(bX - 3, b1Y - 3, bW + 6, b1H + 6, block1C[0], block1C[1], block1C[2], 0.55);
    cv.fillRect(bX, b1Y, bW, b1H, block1C[0], block1C[1], block1C[2], 0.95);

    // 2. Lielais krāsu bloks (apakšā)
    const b2Y = innerY + Math.round(innerH * 0.54);
    const b2H = Math.round(innerH * 0.36);
    cv.fillRect(bX - 6, b2Y - 6, bW + 12, b2H + 12, block2C[0], block2C[1], block2C[2], 0.25);
    cv.fillRect(bX - 3, b2Y - 3, bW + 6, b2H + 6, block2C[0], block2C[1], block2C[2], 0.55);
    cv.fillRect(bX, b2Y, bW, b2H, block2C[0], block2C[1], block2C[2], 0.95);
  } else if (art.theme === 'minimalist') {
    // --- MINIMĀLISMS UN KOSMISKĀS GAISMAS (Vija Celmiņa / Blumbergs / Ģelzis) ---
    if (art.subtheme === 'stars') {
      cv.fillRect(innerX, innerY, innerW, innerH, 15, 18, 26);
      // Zvaigžņu putekļi
      for (let s = 0; s < 250; s++) {
        const sx = innerX + Math.round(Math.abs(Math.sin(s * 73.1 + seed)) * innerW);
        const sy = innerY + Math.round(Math.abs(Math.cos(s * 41.7 + seed)) * innerH);
        const lum = 180 + Math.round(Math.sin(s) * 70);
        cv.fillRect(sx, sy, 1 + (s % 3 === 0 ? 1 : 0), 1 + (s % 3 === 0 ? 1 : 0), lum, lum, 255, 0.85);
      }
    } else if (art.subtheme === 'waves') {
      cv.fillRect(innerX, innerY, innerW, innerH, 35, 40, 50);
      for (let y = innerY; y < innerY + innerH; y += 4) {
        const shade = Math.round(Math.sin(y * 0.08 + seed) * 35 + 50);
        cv.fillRect(innerX, y, innerW, 2, shade, shade + 8, shade + 18, 0.8);
      }
    } else if (art.subtheme === 'gold_black') {
      cv.fillRect(innerX, innerY, innerW, innerH, 28, 25, 24);
      // Zelta saule un lūgšanas zīme (Blumbergs)
      const gX = innerX + innerW / 2;
      const gY = innerY + innerH / 2;
      cv.fillCircle(gX, gY, Math.round(innerH * 0.22), 215, 170, 55);
      cv.fillCircle(gX, gY, Math.round(innerH * 0.12), 28, 25, 24);
      cv.fillRect(gX - Math.round(innerW * 0.3), gY - 3, Math.round(innerW * 0.6), 6, 215, 170, 55);
    } else {
      cv.fillGradientV(innerX, innerY, innerW, innerH, [25, 30, 42], [55, 75, 105]);
      cv.fillCircle(innerX + innerW / 2, innerY + innerH / 2, Math.round(innerH * 0.24), 220, 235, 255, 0.4);
    }
  } else {
    // --- MODERNISTU FIGURATĪVĀS UN KLUSĀS DABAS (Beļcova / Kazaks / Tone / Eliass) ---
    cv.fillGradientV(innerX, innerY, innerW, innerH, [185, 140, 95], [65, 45, 35]);
    // Galda diagonāle
    const tY = innerY + Math.round(innerH * 0.55);
    cv.fillRect(innerX, tY, innerW, innerY + innerH - tY, 110, 75, 48);

    // Formas / augļi / trauki
    const cx = innerX + innerW / 2;
    cv.fillCircle(cx, tY - Math.round(innerH * 0.14), Math.round(innerH * 0.16), 210, 70, 40); // Trauks
    cv.fillCircle(cx - Math.round(innerW * 0.16), tY - Math.round(innerH * 0.05), Math.round(innerH * 0.08), 235, 185, 40); // Ābols/citrons
    cv.fillCircle(cx + Math.round(innerW * 0.18), tY - Math.round(innerH * 0.04), Math.round(innerH * 0.07), 180, 50, 45); // Granātābols
  }

  // Audekla tekstūras pārklājums
  cv.applyTextureNoise(10);

  // 4. MUZEJA BIRKA (Placard) gleznas apakšā
  const tagH = Math.max(38, Math.round(innerH * 0.13));
  const tagW = Math.max(220, Math.min(innerW - 20, Math.round(innerW * 0.90)));
  const tagX = innerX + Math.round((innerW - tagW) / 2);
  const tagY = innerY + innerH - tagH - 8;

  // Birkas fons (puscaurspīdīgs melns ar zeltītu rāmīti)
  cv.fillRect(tagX, tagY, tagW, tagH, 18, 20, 26, 0.92);
  cv.fillRect(tagX, tagY, tagW, 2, 210, 175, 80, 0.85); // Zelta augšējā līnija

  // Teksts 3 rindiņās:
  const fontScale = imgW < 350 ? 1 : 2;
  const lineGap = fontScale * 8 + 2;

  // 1. Rinda: [ASN-XXX] AUTORS (GADS)
  const line1 = `[${art.invNo}] ${art.author.toUpperCase()} (${art.year})`;
  cv.drawText(line1, tagX + 8, tagY + 5, fontScale, 240, 205, 110);

  // 2. Rinda: «NOSAUKUMS»
  const line2 = `"${art.title.toUpperCase()}"`;
  cv.drawText(line2, tagX + 8, tagY + 5 + lineGap, fontScale, 255, 255, 255);

  // 3. Rinda: IZMĒRI, SVARS, H_MONT
  if (tagH >= 45 && fontScale >= 2) {
    const line3 = `${art.width}x${art.height}M | ${art.weight}KG | H=${art.elevation}M`;
    cv.drawText(line3, tagX + 8, tagY + 5 + lineGap * 2, fontScale - 1 > 0 ? fontScale - 1 : 1, 160, 200, 240);
  }

  return cv.toPngBuffer();
}

// ============================================================================
// 6. GALVENĀ ĢENERĒŠANAS PROCEDŪRA
// ============================================================================
async function run() {
  const outDirImages = path.join(__dirname, 'catalog_images');
  if (!fs.existsSync(outDirImages)) {
    fs.mkdirSync(outDirImages, { recursive: true });
  }

  console.log(`[1/4] Ģenerē 100 mākslas darbu attēlus mapē ${outDirImages}...`);
  const fullJsonList = [];
  const csvRows = [];

  // TSV / CSV Galvene
  csvRows.push([
    'Inventāra Nr.',
    'Nosaukums',
    'Autors',
    'Gads',
    'Tehnika',
    'Platums (m)',
    'Augstums (m)',
    'Svars (kg)',
    'Montāžas augstums (m)',
    'Attēla fails'
  ].join('\t'));

  const startTime = Date.now();

  for (let i = 0; i < ARTWORKS.length; i++) {
    const art = ARTWORKS[i];
    const pngBuf = generateArtworkImage(art, 720);

    // Saglabājam PNG failu
    const fileName = `${art.invNo}.png`;
    const filePath = path.join(outDirImages, fileName);
    fs.writeFileSync(filePath, pngBuf);

    // Sagatavojam Base64 datu URI
    const b64Uri = `data:image/png;base64,${pngBuf.toString('base64')}`;

    // Objekts JSON eksportam
    const jsonItem = {
      id: art.invNo.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
      invNo: art.invNo,
      title: art.title,
      author: art.author,
      year: art.year,
      technique: art.technique,
      width: art.width,
      height: art.height,
      weight: art.weight,
      depth: art.depth,
      elevation: art.elevation,
      aspectRatio: Math.round((art.width / art.height) * 100) / 100,
      imageUrl: b64Uri
    };
    fullJsonList.push(jsonItem);

    // Rinda CSV / TSV failam
    csvRows.push([
      art.invNo,
      art.title,
      art.author,
      art.year,
      art.technique,
      art.width.toFixed(2),
      art.height.toFixed(2),
      art.weight.toFixed(1),
      art.elevation.toFixed(2),
      `catalog_images/${fileName}`
    ].join('\t'));

    if ((i + 1) % 20 === 0 || i === ARTWORKS.length - 1) {
      console.log(`  -> Uzģenerēti ${i + 1}/${ARTWORKS.length} eksponāti...`);
    }
  }

  const dur = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`[2/4] Attēlu ģenerēšana pabeigta (${dur}s)!`);

  // 1. Saglabājam CSV / TSV failu (ar UTF-8 BOM, lai Excel atvērtu latviešu burtus bez kropļojumiem)
  const csvPath = path.join(__dirname, 'artworks_catalog.csv');
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  console.log(`[3/4] Excel/CSV fails saglabāts: ${csvPath} (${(csvContent.length / 1024).toFixed(1)} KB)`);

  // 2. Saglabājam JSON failu
  const jsonPath = path.join(__dirname, 'artworks_100.json');
  const jsonContent = JSON.stringify(fullJsonList, null, 2);
  fs.writeFileSync(jsonPath, jsonContent, 'utf8');
  console.log(`[4/4] JSON fails ar base64 attēliem saglabāts: ${jsonPath} (${(jsonContent.length / (1024 * 1024)).toFixed(2)} MB)`);

  console.log('\n✅ VISI 100 EKSPOZĪCIJAS DARBI VEIKSMĪGI UZĢENERĒTI!');
}

run().catch(err => {
  console.error('Kļūda ģenerēšanā:', err);
  process.exit(1);
});
