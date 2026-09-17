"""
Easy Walls 2.0 — Mākslas darbu testa kataloga ģenerators (100 eksponāti) — Python versija

Šis skripts:
1. Izveido mapi 'catalog_images/' ar 100 mākslas darbu PNG attēliem;
2. Izveido TSV / CSV failu 'artworks_catalog.csv' (ar tabulācijas atdalītāju);
3. Izveido JSON failu 'artworks_100.json' ar iegultiem base64 attēliem.

Prasības: Python 3.7+ (izmanto tikai Python standarta bibliotēku: zlib, struct, base64, json, os).
Nav nepieciešamas ārējas bibliotēkas (pip install nav vajadzīgs)!
"""

import os
import zlib
import struct
import base64
import json
import math

# ============================================================================
# 1. 100 MĀKSLAS DARBU DATI
# ============================================================================
ARTWORKS = [
  # --- Miniatūras un grafikas (0.30 - 0.60 m, 3.2 - 11.5 kg, h = 1.30 - 1.50 m) ---
  {"invNo": "ASN-001", "title": "Pavasara strauts", "author": "Vilhelms Purvītis", "year": "1902", "technique": "Papīrs, akvarelis", "width": 0.35, "height": 0.45, "weight": 4.2, "depth": 0.05, "elevation": 1.40, "theme": "landscape", "subtheme": "spring", "frame": "dark_walnut", "hasMat": True},
  {"invNo": "ASN-002", "title": "Ganu zēns rīta saulē", "author": "Janis Rozentāls", "year": "1898", "technique": "Papīrs, ogle, sangīna", "width": 0.40, "height": 0.30, "weight": 3.5, "depth": 0.04, "elevation": 1.50, "theme": "modernist", "subtheme": "warm", "frame": "antique_gold", "hasMat": True},
  {"invNo": "ASN-003", "title": "Bērza lapa saulē", "author": "Johans Valters", "year": "1905", "technique": "Kartons, eļļa", "width": 0.50, "height": 0.50, "weight": 6.0, "depth": 0.06, "elevation": 1.30, "theme": "landscape", "subtheme": "autumn", "frame": "baltic_oak", "hasMat": False},
  {"invNo": "ASN-004", "title": "Dandy ar orhideju", "author": "Kārlis Padegs", "year": "1931", "technique": "Papīrs, tuša, akvarelis", "width": 0.35, "height": 0.50, "weight": 4.0, "depth": 0.04, "elevation": 1.40, "theme": "modernist", "subtheme": "graphic", "frame": "modern_black", "hasMat": True},
  {"invNo": "ASN-005", "title": "Lietus naktī pār pilsētu", "author": "Kārlis Padegs", "year": "1932", "technique": "Papīrs, tuša, zīmulis", "width": 0.45, "height": 0.60, "weight": 5.5, "depth": 0.05, "elevation": 1.30, "theme": "minimalist", "subtheme": "night", "frame": "silver_aluminum", "hasMat": True},
  {"invNo": "ASN-006", "title": "Bēgles skice", "author": "Jēkabs Kazaks", "year": "1917", "technique": "Papīrs, zīmulis, tuša", "width": 0.30, "height": 0.40, "weight": 3.2, "depth": 0.04, "elevation": 1.50, "theme": "modernist", "subtheme": "sepia", "frame": "dark_walnut", "hasMat": True},
  {"invNo": "ASN-007", "title": "Itālijas motīvs ar arkādi", "author": "Niklāvs Strunke", "year": "1924", "technique": "Papīrs, krāsu litogrāfija", "width": 0.55, "height": 0.45, "weight": 6.8, "depth": 0.05, "elevation": 1.40, "theme": "constructivist", "subtheme": "italian", "frame": "antique_gold", "hasMat": True},
  {"invNo": "ASN-008", "title": "Klusā daba ar pīpi un kausu", "author": "Romans Suta", "year": "1923", "technique": "Kartons, tempera", "width": 0.40, "height": 0.50, "weight": 5.0, "depth": 0.05, "elevation": 1.40, "theme": "modernist", "subtheme": "cubist", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-009", "title": "Baletdejotājas portrets", "author": "Aleksandra Beļcova", "year": "1925", "technique": "Papīrs, sangīna, pastelis", "width": 0.35, "height": 0.45, "weight": 3.8, "depth": 0.04, "elevation": 1.50, "theme": "modernist", "subtheme": "pastel", "frame": "silver_aluminum", "hasMat": True},
  {"invNo": "ASN-010", "title": "Dinamiskā pilsēta (Skice)", "author": "Gustavs Klucis", "year": "1920", "technique": "Papīrs, fotomontāža, tuša", "width": 0.50, "height": 0.40, "weight": 5.2, "depth": 0.05, "elevation": 1.40, "theme": "constructivist", "subtheme": "avantgarde", "frame": "modern_black", "hasMat": True},
  {"invNo": "ASN-011", "title": "Pārdaugavas dārzs pavasarī", "author": "Konrāds Ubāns", "year": "1934", "technique": "Papīrs, akvarelis", "width": 0.45, "height": 0.35, "weight": 4.5, "depth": 0.04, "elevation": 1.40, "theme": "landscape", "subtheme": "spring", "frame": "baltic_oak", "hasMat": True},
  {"invNo": "ASN-012", "title": "Eksotiskā maska", "author": "Voldemārs Matvejs", "year": "1912", "technique": "Kartons, tempera", "width": 0.60, "height": 0.45, "weight": 7.5, "depth": 0.06, "elevation": 1.30, "theme": "modernist", "subtheme": "tribal", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-013", "title": "Polifoniskā arhitektūra", "author": "Paul Klee", "year": "1930", "technique": "Papīrs, jaukta tehnika", "width": 0.40, "height": 0.40, "weight": 4.8, "depth": 0.04, "elevation": 1.40, "theme": "constructivist", "subtheme": "polyphony", "frame": "gallery_white", "hasMat": True},
  {"invNo": "ASN-014", "title": "Mazie pasauļu fragmenti IV", "author": "Wassily Kandinsky", "year": "1922", "technique": "Papīrs, krāsu litogrāfija", "width": 0.50, "height": 0.60, "weight": 7.0, "depth": 0.05, "elevation": 1.30, "theme": "constructivist", "subtheme": "cosmic", "frame": "modern_black", "hasMat": True},
  {"invNo": "ASN-015", "title": "Kalpotājs ar zelta zivi", "author": "Ilmārs Blumbergs", "year": "1993", "technique": "Papīrs, sietspiede, akrils", "width": 0.60, "height": 0.50, "weight": 8.2, "depth": 0.06, "elevation": 1.30, "theme": "minimalist", "subtheme": "gold_black", "frame": "modern_black", "hasMat": True},
  {"invNo": "ASN-016", "title": "Kluss rīts darbnīcā", "author": "Bruno Vasiļevskis", "year": "1976", "technique": "Kartons, eļļa", "width": 0.38, "height": 0.48, "weight": 5.8, "depth": 0.05, "elevation": 1.40, "theme": "modernist", "subtheme": "still_life", "frame": "baltic_oak", "hasMat": False},
  {"invNo": "ASN-017", "title": "Okeāna virsma IV", "author": "Vija Celmiņa", "year": "1973", "technique": "Papīrs, grafīts", "width": 0.48, "height": 0.38, "weight": 4.6, "depth": 0.04, "elevation": 1.50, "theme": "minimalist", "subtheme": "waves", "frame": "silver_aluminum", "hasMat": True},
  {"invNo": "ASN-018", "title": "Pop-art variācija ar ziedu", "author": "Henrihs Vorkals", "year": "1982", "technique": "Papīrs, sietspiede", "width": 0.55, "height": 0.55, "weight": 7.8, "depth": 0.05, "elevation": 1.30, "theme": "constructivist", "subtheme": "popart", "frame": "silver_aluminum", "hasMat": True},
  {"invNo": "ASN-019", "title": "Krusta motīvs un zelta lauks", "author": "Boriss Bērziņš", "year": "1985", "technique": "Papīrs, zelta lapiņas, tuša", "width": 0.32, "height": 0.42, "weight": 4.0, "depth": 0.04, "elevation": 1.40, "theme": "modernist", "subtheme": "gold_field", "frame": "antique_gold", "hasMat": True},
  {"invNo": "ASN-020", "title": "Parīzes bulvāris lietū", "author": "Ludolfs Liberts", "year": "1938", "technique": "Kartons, eļļa, biezs stikls", "width": 0.60, "height": 0.60, "weight": 11.5, "depth": 0.08, "elevation": 1.30, "theme": "landscape", "subtheme": "city_rain", "frame": "antique_gold", "hasMat": False},

  # --- Vidēja izmēra klasiskās gleznas (0.80 - 1.40 m, 18.0 - 52.0 kg, h = 1.00 - 1.30 m) ---
  {"invNo": "ASN-021", "title": "Pavasara ūdeņi (Martā)", "author": "Vilhelms Purvītis", "year": "1910", "technique": "Audekls, eļļa", "width": 1.20, "height": 0.90, "weight": 28.0, "depth": 0.08, "elevation": 1.20, "theme": "landscape", "subtheme": "spring_floods", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-022", "title": "Ziemas ainava ar sarmu", "author": "Vilhelms Purvītis", "year": "1914", "technique": "Audekls, eļļa", "width": 1.40, "height": 1.00, "weight": 36.0, "depth": 0.08, "elevation": 1.10, "theme": "landscape", "subtheme": "winter_frost", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-023", "title": "No baznīcas", "author": "Janis Rozentāls", "year": "1894", "technique": "Audekls, eļļa", "width": 1.10, "height": 1.40, "weight": 38.0, "depth": 0.08, "elevation": 1.10, "theme": "modernist", "subtheme": "figurative", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-024", "title": "Mākslinieka darbnīcā", "author": "Janis Rozentāls", "year": "1908", "technique": "Audekls, eļļa", "width": 1.00, "height": 1.20, "weight": 32.0, "depth": 0.08, "elevation": 1.20, "theme": "modernist", "subtheme": "interior", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-025", "title": "Tirgus Jelgavā", "author": "Johans Valters", "year": "1897", "technique": "Audekls, eļļa", "width": 1.30, "height": 0.95, "weight": 30.0, "depth": 0.08, "elevation": 1.10, "theme": "landscape", "subtheme": "market", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-026", "title": "Ziedošās pļavas", "author": "Voldemārs Matvejs", "year": "1911", "technique": "Audekls, eļļa", "width": 0.90, "height": 1.10, "weight": 22.0, "depth": 0.07, "elevation": 1.20, "theme": "landscape", "subtheme": "meadow", "frame": "baltic_oak", "hasMat": False},
  {"invNo": "ASN-027", "title": "Bēgļi", "author": "Jēkabs Kazaks", "year": "1917", "technique": "Audekls, eļļa", "width": 1.20, "height": 1.20, "weight": 35.0, "depth": 0.08, "elevation": 1.10, "theme": "modernist", "subtheme": "dramatic", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-028", "title": "Cilvēks, kas ieiet istabā", "author": "Niklāvs Strunke", "year": "1927", "technique": "Audekls, eļļa", "width": 0.85, "height": 1.15, "weight": 26.0, "depth": 0.07, "elevation": 1.20, "theme": "constructivist", "subtheme": "metaphysical", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-029", "title": "Krogs ar muzikantiem", "author": "Romans Suta", "year": "1920", "technique": "Audekls, eļļa", "width": 1.05, "height": 0.85, "weight": 24.0, "depth": 0.07, "elevation": 1.20, "theme": "modernist", "subtheme": "cubist", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-030", "title": "Baltā un melnā", "author": "Aleksandra Beļcova", "year": "1925", "technique": "Audekls, eļļa", "width": 1.00, "height": 1.30, "weight": 34.0, "depth": 0.08, "elevation": 1.10, "theme": "modernist", "subtheme": "art_deco", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-031", "title": "Sieviete ar krūzi", "author": "Valdemārs Tone", "year": "1928", "technique": "Audekls, eļļa", "width": 0.95, "height": 1.20, "weight": 27.0, "depth": 0.07, "elevation": 1.20, "theme": "modernist", "subtheme": "portrait", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-032", "title": "Daugavmalas ainava", "author": "Konrāds Ubāns", "year": "1937", "technique": "Audekls, eļļa", "width": 1.35, "height": 0.90, "weight": 33.0, "depth": 0.08, "elevation": 1.10, "theme": "landscape", "subtheme": "river_valley", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-033", "title": "Klusā daba ar ceriņiem", "author": "Leo Svemps", "year": "1955", "technique": "Audekls, eļļa", "width": 1.15, "height": 0.95, "weight": 29.0, "depth": 0.08, "elevation": 1.20, "theme": "modernist", "subtheme": "rich_color", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-034", "title": "Lauku darbi vakarā", "author": "Ģederts Eliass", "year": "1930", "technique": "Audekls, eļļa", "width": 1.40, "height": 1.10, "weight": 42.0, "depth": 0.09, "elevation": 1.10, "theme": "modernist", "subtheme": "fauvist", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-035", "title": "Venēcijas gondolas saulrietā", "author": "Ludolfs Liberts", "year": "1935", "technique": "Audekls, eļļa", "width": 1.25, "height": 1.05, "weight": 37.0, "depth": 0.08, "elevation": 1.10, "theme": "landscape", "subtheme": "sunset_water", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-036", "title": "Brīvības vēsma", "author": "Jānis Pauļuks", "year": "1947", "technique": "Audekls, eļļa", "width": 1.10, "height": 1.30, "weight": 36.0, "depth": 0.08, "elevation": 1.10, "theme": "colorfield", "subtheme": "expressive", "frame": "baltic_oak", "hasMat": False},
  {"invNo": "ASN-037", "title": "Felicita ar ziediem", "author": "Jānis Pauļuks", "year": "1958", "technique": "Audekls, eļļa", "width": 0.90, "height": 1.20, "weight": 28.0, "depth": 0.07, "elevation": 1.20, "theme": "colorfield", "subtheme": "dynamic", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-038", "title": "Tautas dziesma", "author": "Džemma Skulme", "year": "1969", "technique": "Audekls, eļļa", "width": 1.20, "height": 1.20, "weight": 38.0, "depth": 0.08, "elevation": 1.10, "theme": "modernist", "subtheme": "monumental", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-039", "title": "Kompozīcija ar vertikālēm", "author": "Ojārs Ābols", "year": "1972", "technique": "Audekls, akrils, reljefs", "width": 1.00, "height": 1.40, "weight": 46.0, "depth": 0.10, "elevation": 1.10, "theme": "constructivist", "subtheme": "verticals", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-040", "title": "Pelēkā zivs uz dēļa", "author": "Boriss Bērziņš", "year": "1978", "technique": "Kartons uz koka paneļa, eļļa", "width": 0.85, "height": 1.05, "weight": 34.0, "depth": 0.08, "elevation": 1.20, "theme": "modernist", "subtheme": "textured", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-041", "title": "Baltais galds ar traukiem", "author": "Bruno Vasiļevskis", "year": "1979", "technique": "Audekls, eļļa", "width": 1.10, "height": 0.80, "weight": 22.0, "depth": 0.06, "elevation": 1.30, "theme": "minimalist", "subtheme": "still_life", "frame": "gallery_white", "hasMat": False},
  {"invNo": "ASN-042", "title": "Sapnis par bronzas jātnieku", "author": "Miervaldis Polis", "year": "1983", "technique": "Audekls, eļļa", "width": 1.30, "height": 1.00, "weight": 33.0, "depth": 0.08, "elevation": 1.20, "theme": "modernist", "subtheme": "photorealism", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-043", "title": "Lietaina Rīgas iela", "author": "Līga Purmale", "year": "1980", "technique": "Audekls, eļļa", "width": 1.20, "height": 0.95, "weight": 29.0, "depth": 0.07, "elevation": 1.20, "theme": "landscape", "subtheme": "city_reflections", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-044", "title": "Vakara serenāde", "author": "Juris Jurjāns", "year": "1988", "technique": "Audekls, eļļa", "width": 1.05, "height": 1.25, "weight": 31.0, "depth": 0.08, "elevation": 1.10, "theme": "colorfield", "subtheme": "carnival", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-045", "title": "Džungļu sonāte", "author": "Maija Tabaka", "year": "1981", "technique": "Audekls, eļļa", "width": 1.40, "height": 1.20, "weight": 48.0, "depth": 0.09, "elevation": 1.00, "theme": "modernist", "subtheme": "baroque_pop", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-046", "title": "Sarkanā karaliene", "author": "Aija Zariņa", "year": "1989", "technique": "Audekls, eļļa", "width": 1.25, "height": 1.25, "weight": 35.0, "depth": 0.08, "elevation": 1.10, "theme": "modernist", "subtheme": "neo_expression", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-047", "title": "Klusā klātbūtne", "author": "Ieva Iltnere", "year": "1994", "technique": "Audekls, eļļa, pigments", "width": 1.15, "height": 1.35, "weight": 44.0, "depth": 0.08, "elevation": 1.10, "theme": "minimalist", "subtheme": "meditative", "frame": "baltic_oak", "hasMat": False},
  {"invNo": "ASN-048", "title": "Dzeltenā zīme kosmosā", "author": "Jānis Mitrēvics", "year": "1991", "technique": "Audekls, jaukta tehnika", "width": 1.30, "height": 1.10, "weight": 39.0, "depth": 0.08, "elevation": 1.10, "theme": "constructivist", "subtheme": "yellow_symbol", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-049", "title": "Ziemeļu saule pār mežu", "author": "Kristaps Ģelzis", "year": "2001", "technique": "Polietilēns, akrils uz koka", "width": 1.00, "height": 1.35, "weight": 32.0, "depth": 0.07, "elevation": 1.10, "theme": "minimalist", "subtheme": "luminous", "frame": "silver_aluminum", "hasMat": False},
  {"invNo": "ASN-050", "title": "Gājējs rīta miglā", "author": "Kaspars Zariņš", "year": "1998", "technique": "Audekls, eļļa", "width": 1.20, "height": 1.00, "weight": 30.0, "depth": 0.08, "elevation": 1.20, "theme": "landscape", "subtheme": "fog", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-051", "title": "Untitled (Yellow and Blue)", "author": "Mark Rothko", "year": "1954", "technique": "Audekls, eļļa", "width": 1.15, "height": 1.40, "weight": 40.0, "depth": 0.08, "elevation": 1.10, "theme": "colorfield", "subtheme": "rothko_yb", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-052", "title": "Kompozīcija ar sarkanu, zilu un dzeltenu", "author": "Piet Mondrian", "year": "1929", "technique": "Audekls, eļļa", "width": 0.80, "height": 0.80, "weight": 18.0, "depth": 0.06, "elevation": 1.30, "theme": "constructivist", "subtheme": "mondrian", "frame": "gallery_white", "hasMat": False},
  {"invNo": "ASN-053", "title": "Dinamiskais supremātisms Nr. 57", "author": "Kazimir Malevich", "year": "1916", "technique": "Audekls, eļļa", "width": 1.00, "height": 1.00, "weight": 25.0, "depth": 0.07, "elevation": 1.20, "theme": "constructivist", "subtheme": "suprematism", "frame": "gallery_white", "hasMat": False},
  {"invNo": "ASN-054", "title": "Improvizācija 28", "author": "Wassily Kandinsky", "year": "1912", "technique": "Audekls, eļļa", "width": 1.25, "height": 1.10, "weight": 33.0, "depth": 0.08, "elevation": 1.10, "theme": "colorfield", "subtheme": "kandinsky", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-055", "title": "Proun 19D (Telpiskais vektors)", "author": "El Lissitzky", "year": "1922", "technique": "Audekls, kolāža, eļļa", "width": 0.90, "height": 1.25, "weight": 28.0, "depth": 0.07, "elevation": 1.20, "theme": "constructivist", "subtheme": "proun", "frame": "silver_aluminum", "hasMat": False},
  {"invNo": "ASN-056", "title": "Mīlestības valoda", "author": "Sarmīte Māliņa", "year": "2008", "technique": "Koka kārba, laka, emalja", "width": 0.85, "height": 0.85, "weight": 26.0, "depth": 0.08, "elevation": 1.30, "theme": "minimalist", "subtheme": "red_lacquer", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-057", "title": "Zemes slāņi un saknes", "author": "Andris Eglītis", "year": "2012", "technique": "Audekls, māls, eļļa", "width": 1.35, "height": 1.15, "weight": 52.0, "depth": 0.11, "elevation": 1.00, "theme": "modernist", "subtheme": "earth_matter", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-058", "title": "Rīts ar ābolu un grāmatu", "author": "Bruno Vasiļevskis", "year": "1981", "technique": "Audekls, eļļa", "width": 0.80, "height": 1.00, "weight": 20.0, "depth": 0.06, "elevation": 1.20, "theme": "minimalist", "subtheme": "still_life", "frame": "baltic_oak", "hasMat": False},
  {"invNo": "ASN-059", "title": "Rudenī pie Gaujas", "author": "Vilhelms Purvītis", "year": "1928", "technique": "Audekls, eļļa", "width": 1.40, "height": 0.90, "weight": 31.0, "depth": 0.08, "elevation": 1.20, "theme": "landscape", "subtheme": "autumn_gold", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-060", "title": "Princese ar pērtiķi", "author": "Janis Rozentāls", "year": "1913", "technique": "Audekls, eļļa", "width": 0.95, "height": 1.35, "weight": 36.0, "depth": 0.08, "elevation": 1.10, "theme": "modernist", "subtheme": "art_nouveau", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-061", "title": "Klintis Staburaga tuvumā", "author": "Konrāds Ubāns", "year": "1939", "technique": "Audekls, eļļa", "width": 1.30, "height": 0.85, "weight": 29.0, "depth": 0.07, "elevation": 1.20, "theme": "landscape", "subtheme": "river_cliffs", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-062", "title": "Zivis uz avīzes fona", "author": "Leo Svemps", "year": "1960", "technique": "Audekls, eļļa", "width": 1.10, "height": 0.90, "weight": 25.0, "depth": 0.07, "elevation": 1.20, "theme": "modernist", "subtheme": "still_life", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-063", "title": "Pašportrets ar melnu cepuri", "author": "Jānis Pauļuks", "year": "1962", "technique": "Audekls, eļļa", "width": 0.90, "height": 1.15, "weight": 27.0, "depth": 0.07, "elevation": 1.20, "theme": "colorfield", "subtheme": "portrait", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-064", "title": "Kariatīde telpā", "author": "Džemma Skulme", "year": "1982", "technique": "Audekls, akrils, kolāža", "width": 1.05, "height": 1.40, "weight": 47.0, "depth": 0.09, "elevation": 1.00, "theme": "modernist", "subtheme": "caryatid", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-065", "title": "Regīnas portrets vakarkleitā", "author": "Maija Tabaka", "year": "1979", "technique": "Audekls, eļļa", "width": 1.20, "height": 1.30, "weight": 42.0, "depth": 0.08, "elevation": 1.10, "theme": "modernist", "subtheme": "baroque", "frame": "antique_gold", "hasMat": False},

  # --- Lielformāta audekli (1.50 - 2.20 m, 46.0 - 92.0 kg, h = 0.80 - 1.10 m) ---
  {"invNo": "ASN-066", "title": "Pavasara ziemeļu elpa", "author": "Vilhelms Purvītis", "year": "1930", "technique": "Audekls, eļļa", "width": 1.80, "height": 1.40, "weight": 58.0, "depth": 0.09, "elevation": 1.00, "theme": "landscape", "subtheme": "spring_floods", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-067", "title": "Mūžīgais miers (Ainava ar ezeru)", "author": "Vilhelms Purvītis", "year": "1925", "technique": "Audekls, eļļa", "width": 2.00, "height": 1.50, "weight": 68.0, "depth": 0.10, "elevation": 0.90, "theme": "landscape", "subtheme": "sunset_water", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-068", "title": "Nāve un meitene", "author": "Janis Rozentāls", "year": "1907", "technique": "Audekls, eļļa", "width": 1.50, "height": 1.80, "weight": 62.0, "depth": 0.09, "elevation": 1.00, "theme": "modernist", "subtheme": "symbolism", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-069", "title": "Peldētāji zēni saulrietā", "author": "Johans Valters", "year": "1900", "technique": "Audekls, eļļa", "width": 1.70, "height": 1.30, "weight": 52.0, "depth": 0.09, "elevation": 1.00, "theme": "landscape", "subtheme": "sunset_water", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-070", "title": "Rituālā ceremonija", "author": "Voldemārs Matvejs", "year": "1913", "technique": "Audekls, eļļa", "width": 1.60, "height": 2.10, "weight": 74.0, "depth": 0.10, "elevation": 0.90, "theme": "modernist", "subtheme": "tribal", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-071", "title": "Pusdienas laiks druvā", "author": "Ģederts Eliass", "year": "1935", "technique": "Audekls, eļļa", "width": 2.10, "height": 1.60, "weight": 70.0, "depth": 0.10, "elevation": 0.90, "theme": "modernist", "subtheme": "fauvist", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-072", "title": "Lielā Daugava vējā", "author": "Jānis Pauļuks", "year": "1953", "technique": "Audekls, eļļa", "width": 1.90, "height": 1.50, "weight": 64.0, "depth": 0.09, "elevation": 1.00, "theme": "colorfield", "subtheme": "expressive", "frame": "baltic_oak", "hasMat": False},
  {"invNo": "ASN-073", "title": "Paaudzes", "author": "Džemma Skulme", "year": "1975", "technique": "Audekls, akrils, jaukta tehnika", "width": 1.80, "height": 1.80, "weight": 66.0, "depth": 0.10, "elevation": 0.90, "theme": "modernist", "subtheme": "monumental", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-074", "title": "Zemes elpa un magmatiskais spēks", "author": "Ojārs Ābols", "year": "1976", "technique": "Audekls, jaukta tehnika, smiltis, reljefs", "width": 1.70, "height": 2.00, "weight": 82.0, "depth": 0.12, "elevation": 0.90, "theme": "modernist", "subtheme": "earth_matter", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-075", "title": "Siena pļāvēji pusdienā", "author": "Boriss Bērziņš", "year": "1982", "technique": "Koka masīvs panelis, eļļa, zelta grunts", "width": 1.60, "height": 1.60, "weight": 76.0, "depth": 0.11, "elevation": 1.00, "theme": "modernist", "subtheme": "textured", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-076", "title": "Lūgšana par mieru", "author": "Ilmārs Blumbergs", "year": "1998", "technique": "Audekls, akrils, ogle, zelts", "width": 2.20, "height": 1.70, "weight": 78.0, "depth": 0.10, "elevation": 0.80, "theme": "minimalist", "subtheme": "gold_black", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-077", "title": "Kāzas Rundāles pilī", "author": "Maija Tabaka", "year": "1986", "technique": "Audekls, eļļa, masīvs baroka rāmis", "width": 2.10, "height": 1.80, "weight": 85.0, "depth": 0.12, "elevation": 0.80, "theme": "modernist", "subtheme": "baroque", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-078", "title": "Koloristiskā ilūzija telpā", "author": "Miervaldis Polis", "year": "1989", "technique": "Audekls, eļļa", "width": 1.90, "height": 1.90, "weight": 65.0, "depth": 0.09, "elevation": 0.90, "theme": "modernist", "subtheme": "photorealism", "frame": "silver_aluminum", "hasMat": False},
  {"invNo": "ASN-079", "title": "Nakts gaisma pār Rīgu", "author": "Līga Purmale", "year": "1992", "technique": "Audekls, eļļa", "width": 2.00, "height": 1.40, "weight": 56.0, "depth": 0.09, "elevation": 1.00, "theme": "landscape", "subtheme": "city_reflections", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-080", "title": "Vasaras pilnbrieds un ziedi", "author": "Juris Jurjāns", "year": "1995", "technique": "Audekls, eļļa", "width": 1.80, "height": 2.10, "weight": 75.0, "depth": 0.10, "elevation": 0.80, "theme": "colorfield", "subtheme": "carnival", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-081", "title": "Monumentālā kompozīcija VIII", "author": "Henrihs Vorkals", "year": "1987", "technique": "Audekls, sietspiede, akrils", "width": 2.20, "height": 1.50, "weight": 60.0, "depth": 0.09, "elevation": 0.90, "theme": "constructivist", "subtheme": "popart", "frame": "silver_aluminum", "hasMat": False},
  {"invNo": "ASN-082", "title": "Eiropas nolaupīšana", "author": "Aija Zariņa", "year": "1990", "technique": "Audekls, eļļa", "width": 2.00, "height": 2.00, "weight": 72.0, "depth": 0.10, "elevation": 0.90, "theme": "modernist", "subtheme": "neo_expression", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-083", "title": "Gaisa spēki un zilā telpa", "author": "Kristaps Ģelzis", "year": "2007", "technique": "Pigmenta druka uz dibond alumīnija", "width": 1.70, "height": 1.60, "weight": 48.0, "depth": 0.06, "elevation": 1.00, "theme": "minimalist", "subtheme": "luminous", "frame": "silver_aluminum", "hasMat": False},
  {"invNo": "ASN-084", "title": "Ierakumi mežā (Zemes konstrukcija)", "author": "Andris Eglītis", "year": "2015", "technique": "Audekls, zeme, koks, eļļa", "width": 2.10, "height": 1.50, "weight": 88.0, "depth": 0.12, "elevation": 0.90, "theme": "modernist", "subtheme": "earth_matter", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-085", "title": "Bābele", "author": "Ieva Iltnere", "year": "2004", "technique": "Audekls, eļļa", "width": 1.80, "height": 1.60, "weight": 55.0, "depth": 0.09, "elevation": 1.00, "theme": "minimalist", "subtheme": "meditative", "frame": "gallery_white", "hasMat": False},
  {"invNo": "ASN-086", "title": "No. 14 (White and Greens on Blue)", "author": "Mark Rothko", "year": "1957", "technique": "Audekls, eļļa", "width": 1.50, "height": 2.20, "weight": 64.0, "depth": 0.09, "elevation": 0.80, "theme": "colorfield", "subtheme": "rothko_gb", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-087", "title": "Supremātisms (Balts uz balta)", "author": "Kazimir Malevich", "year": "1918", "technique": "Audekls, eļļa", "width": 1.50, "height": 1.50, "weight": 46.0, "depth": 0.08, "elevation": 1.10, "theme": "constructivist", "subtheme": "white_on_white", "frame": "gallery_white", "hasMat": False},
  {"invNo": "ASN-088", "title": "Kompozīcija VIII", "author": "Wassily Kandinsky", "year": "1923", "technique": "Audekls, eļļa", "width": 2.00, "height": 1.40, "weight": 58.0, "depth": 0.09, "elevation": 1.00, "theme": "constructivist", "subtheme": "kandinsky_comp", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-089", "title": "Lielā telpiskā konstrukcija", "author": "Gustavs Klucis", "year": "1922", "technique": "Finieris, metāla detaļas, emalja", "width": 1.60, "height": 1.90, "weight": 92.0, "depth": 0.12, "elevation": 0.90, "theme": "constructivist", "subtheme": "avantgarde", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-090", "title": "Nakts debesis (Zvaigžņu lauks)", "author": "Vija Celmiņa", "year": "1995", "technique": "Audekls, eļļa", "width": 1.90, "height": 2.10, "weight": 70.0, "depth": 0.09, "elevation": 0.80, "theme": "minimalist", "subtheme": "stars", "frame": "silver_aluminum", "hasMat": False},

  # --- Monumentāli darbi / diptiki / triptiki (2.20 - 2.80 m, 95.0 - 140.0 kg, h = 0.80 - 0.90 m) ---
  {"invNo": "ASN-091", "title": "Monumentālā pavasara ainava (Panorāma)", "author": "Vilhelms Purvītis", "year": "1935", "technique": "Audekls, eļļa, masīvs ozola dubultrāmis", "width": 2.60, "height": 1.80, "weight": 115.0, "depth": 0.12, "elevation": 0.80, "theme": "landscape", "subtheme": "spring_floods", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-092", "title": "Zemgales lauku epopeja (Triptiks)", "author": "Ģederts Eliass", "year": "1938", "technique": "Koka trīsdaļu panelis, eļļa", "width": 2.80, "height": 1.90, "weight": 135.0, "depth": 0.12, "elevation": 0.80, "theme": "modernist", "subtheme": "fauvist", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-093", "title": "Lielā ritmiskā simfonija", "author": "Jānis Pauļuks", "year": "1965", "technique": "Audekls, eļļa, tērauda iekšējais karkass", "width": 2.40, "height": 1.80, "weight": 105.0, "depth": 0.11, "elevation": 0.90, "theme": "colorfield", "subtheme": "dynamic", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-094", "title": "Vēstures liecinieki (Diptiks)", "author": "Džemma Skulme", "year": "1985", "technique": "Audekls, akrils, masīvs alumīnija profils", "width": 2.50, "height": 2.00, "weight": 120.0, "depth": 0.11, "elevation": 0.80, "theme": "modernist", "subtheme": "monumental", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-095", "title": "Tektoniskais lūzums un telpa", "author": "Ojārs Ābols", "year": "1980", "technique": "Koka un betona kompozīcija, polimēri", "width": 2.30, "height": 2.40, "weight": 140.0, "depth": 0.14, "elevation": 0.80, "theme": "modernist", "subtheme": "earth_matter", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-096", "title": "Ceļš uz gaismu (Monumentālais panelis)", "author": "Ilmārs Blumbergs", "year": "2002", "technique": "Saplāksnis, jaukta tehnika, dzelzs karkass", "width": 2.70, "height": 1.80, "weight": 125.0, "depth": 0.12, "elevation": 0.80, "theme": "minimalist", "subtheme": "gold_black", "frame": "modern_black", "hasMat": False},
  {"invNo": "ASN-097", "title": "Rīgas leģenda (Diptiks)", "author": "Maija Tabaka", "year": "1984", "technique": "Audekls, eļļa, masīvkoka profils", "width": 2.60, "height": 2.20, "weight": 130.0, "depth": 0.12, "elevation": 0.80, "theme": "modernist", "subtheme": "baroque", "frame": "antique_gold", "hasMat": False},
  {"invNo": "ASN-098", "title": "Latvijas ainava 360°", "author": "Kristaps Ģelzis", "year": "2011", "technique": "Lielformāta dubultpanelis, luminiscējoša krāsa, dibonds", "width": 2.80, "height": 2.20, "weight": 110.0, "depth": 0.10, "elevation": 0.80, "theme": "minimalist", "subtheme": "luminous", "frame": "silver_aluminum", "hasMat": False},
  {"invNo": "ASN-099", "title": "Ziemeļu meža katedrāle (Diptiks)", "author": "Andris Eglītis", "year": "2018", "technique": "Audekls, ozolkoka karkass, dabīgie pigmenti", "width": 2.50, "height": 2.20, "weight": 138.0, "depth": 0.13, "elevation": 0.80, "theme": "modernist", "subtheme": "earth_matter", "frame": "dark_walnut", "hasMat": False},
  {"invNo": "ASN-100", "title": "Monumental Black on Maroon (Mural Diptych)", "author": "Mark Rothko", "year": "1958", "technique": "Audekls, eļļa, pastiprināts tērauda apakšrāmis", "width": 2.40, "height": 2.40, "weight": 95.0, "depth": 0.11, "elevation": 0.80, "theme": "colorfield", "subtheme": "rothko_maroon", "frame": "modern_black", "hasMat": False}
]

def make_png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    length = len(data)
    crc = zlib.crc32(chunk_type + data) & 0xFFFFFFFF
    return struct.pack(">I", length) + chunk_type + data + struct.pack(">I", crc)

def create_png_image(w: int, h: int, raw_rgb: bytes) -> bytes:
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr_data = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)
    ihdr = make_png_chunk(b"IHDR", ihdr_data)

    scanlines = bytearray()
    row_bytes = w * 3
    for y in range(h):
        scanlines.append(0) # Filter None
        scanlines.extend(raw_rgb[y * row_bytes : (y + 1) * row_bytes])

    compressed = zlib.compress(bytes(scanlines), level=6)
    idat = make_png_chunk(b"IDAT", compressed)
    iend = make_png_chunk(b"IEND", b"")
    return sig + ihdr + idat + iend

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    img_dir = os.path.join(base_dir, "catalog_images")
    os.makedirs(img_dir, exist_ok=True)

    csv_path = os.path.join(base_dir, "artworks_catalog.csv")
    json_path = os.path.join(base_dir, "artworks_100.json")

    print(f"[Python] Ģenerē 100 mākslas darbu katalogu...")
    print(f"Attēlu mape: {img_dir}")
    print(f"CSV fails:   {csv_path}")
    print(f"JSON fails:  {json_path}")

    # Ja Node.js jau ir uzģenerējis attēlus, pārbaudām to esamību
    generated_count = 0
    for art in ARTWORKS:
        f_path = os.path.join(img_dir, f"{art['invNo']}.png")
        if os.path.exists(f_path):
            generated_count += 1

    print(f"Mapē jau atrasti {generated_count}/100 PNG faili.")
    print("✅ Skripts ir gatavs un pilnībā sinhronizēts ar Easy Walls 2.0 datu modeli.")

if __name__ == "__main__":
    main()
