/* ============================================================
   ORTE — echte Neuburg-Wahrzeichen. Positionen sind aus echten
   Koordinaten (OpenStreetMap) hergeleitet und auf Weltkoordinaten
   (x,z) skaliert, damit die Lage zueinander stimmt: Amalienstraße
   verbindet Oberes Tor -> Karlsplatz, Rathaus liegt nördlich vom
   Platz, Hofkirche östlich, Residenzschloss südöstlich Richtung
   Donau, Donaukai am Fluss. "Hofgarten" sitzt auf der echten
   Luitpoldstraße (Café-/Kneipenmeile östlich vom Schloss) — Insider-
   Spitzname der Freundesgruppe, nicht der historische Schlossgarten.
   shape steuert die Bauform. Neue Orte: einfach ein Objekt mehr
   in dieses Array — und ggf. einen ROAD-Eintrag in world.js.
   ============================================================ */
export const LOCATIONS = [
  {
    id:"oberes_tor", name:"Oberes Tor", x:-132, z:74, shape:"gate",
    color:"#C1442E", radius:4.2,
    flavor:"Das rote Stadttor im Westen der Altstadt, 1541 umgestaltet – hier beginnt die Amalienstraße und jede Neuburg-Runde.",
    reward:40, rate:0.4
  },
  {
    id:"karlsplatz", name:"Karlsplatz", x:0, z:0, shape:"plaza",
    color:"#E8C77E", radius:6,
    flavor:"Das Herz der Altstadt, umringt von bunten Renaissance- und Barockhäusern. Hier trifft sich alles und jeder.",
    reward:60, rate:0.6
  },
  {
    id:"rathaus", name:"Rathaus", x:17, z:-26, shape:"hall",
    color:"#D9A441", radius:4,
    flavor:"An der Nordseite des Karlsplatz, mit markanter zweiseitiger Außentreppe – Vorbild war ein Senatorenpalast in Rom.",
    reward:80, rate:0.9
  },
  {
    id:"bibliothek", name:"Provinzialbibliothek", x:-29, z:-4, shape:"library",
    color:"#7A3B2E", radius:4,
    flavor:"Ein historischer Bibliothekssaal voller alter Bücher und Geheimnisse. Fühlt sich an wie ein Ort für Insider-Wissen.",
    reward:90, rate:1.0
  },
  {
    id:"hofkirche", name:"Hofkirche zu unserer lieben Frau", x:43, z:-8, shape:"church",
    color:"#8FA3B0", radius:4,
    flavor:"Renaissance-Kirchenbau am Ostrand des Karlsplatz. Ursprünglich protestantisch geplant, katholisch eingeweiht.",
    reward:90, rate:1.0
  },
  {
    id:"unteres_tor", name:"Unteres Tor", x:113, z:-12, shape:"gate",
    color:"#B5562F", radius:4.2,
    flavor:"Das zweite Stadttor im Osten, Richtung Amalienstraße-Fortsetzung und dem Rest der Stadt.",
    reward:110, rate:1.2
  },
  {
    id:"schloss", name:"Residenzschloss", x:83, z:21, shape:"castle",
    color:"#D98B6B", radius:8,
    flavor:"Das Wahrzeichen der Stadt, auf einem Kalkfelsen über der Donau. Vier Flügel, erbaut ab 1530 unter Pfalzgraf Ottheinrich.",
    reward:260, rate:3.0
  },
  {
    id:"hofgarten", name:"Hofgarten", x:138.1, z:68.1, shape:"cafe",
    color:"#E8896B", radius:6,
    flavor:"Eigentlich die Luitpoldstraße – aber unter Freunden heißt das hier nur 'Hofgarten'. Café-Tische, bunte Fassaden, Blick Richtung Schloss.",
    reward:190, rate:2.2
  },
  {
    id:"donaukai", name:"Donaukai", x:60, z:140, shape:"dock",
    color:"#3D8F8F", radius:5,
    flavor:"Die Promenade direkt an der Donau, mit Blick auf die Altstadt-Silhouette. Bester Ort zum Abhängen.",
    reward:140, rate:1.6
  }
];
