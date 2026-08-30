/* ============================================================
   ORTE — echte Neuburg-Wahrzeichen, ungefähr an ihrer echten
   relativen Lage zueinander. Position in Weltkoordinaten (x,z).
   shape steuert die Bauform. Text/Belohnung frei anpassbar.
   Neue Orte: einfach ein Objekt mehr in dieses Array.
   ============================================================ */
export const LOCATIONS = [
  {
    id:"oberes_tor", name:"Oberes Tor", x:-18, z:4, shape:"gate",
    color:"#C1442E", radius:3.4,
    flavor:"Das rote Stadttor im Westen der Altstadt – hier beginnt jede Neuburg-Runde. 16. Jahrhundert, mit Stadtwappen an der Fassade.",
    reward:40, rate:0.4
  },
  {
    id:"karlsplatz", name:"Karlsplatz", x:0, z:0, shape:"plaza",
    color:"#E8C77E", radius:4.5,
    flavor:"Das Herz der Altstadt, umringt von bunten Renaissance- und Barockhäusern. Hier trifft sich alles und jeder.",
    reward:60, rate:0.6
  },
  {
    id:"rathaus", name:"Rathaus", x:-5, z:-4, shape:"hall",
    color:"#D9A441", radius:3.2,
    flavor:"An der Nordseite des Karlsplatz, mit markanter zweiseitiger Außentreppe – Vorbild war ein Senatorenpalast in Rom.",
    reward:70, rate:0.8
  },
  {
    id:"hofkirche", name:"Hofkirche zu unserer lieben Frau", x:5, z:-2, shape:"church",
    color:"#8FA3B0", radius:3.2,
    flavor:"Renaissance-Kirchenbau am Ostrand des Karlsplatz. Ursprünglich protestantisch geplant, katholisch eingeweiht.",
    reward:80, rate:0.9
  },
  {
    id:"bibliothek", name:"Provinzialbibliothek", x:-8, z:-9, shape:"library",
    color:"#7A3B2E", radius:3.2,
    flavor:"Ein historischer Bibliothekssaal voller alter Bücher und Geheimnisse. Fühlt sich an wie ein Ort für Insider-Wissen.",
    reward:90, rate:1.0
  },
  {
    id:"schloss", name:"Residenzschloss", x:3, z:-18, shape:"castle",
    color:"#D98B6B", radius:5.5,
    flavor:"Das Wahrzeichen der Stadt, thront über der Donau. Innen- und Hinterhof mit Sgraffiti-Kunst frei zugänglich.",
    reward:220, rate:2.6
  },
  {
    id:"donaukai", name:"Donaukai", x:9, z:-21, shape:"dock",
    color:"#3D8F8F", radius:4,
    flavor:"Die Promenade direkt an der Donau, mit Blick auf die Altstadt-Silhouette. Bester Ort zum Abhängen.",
    reward:90, rate:1.0
  },
  {
    id:"unteres_tor", name:"Unteres Tor", x:17, z:8, shape:"gate",
    color:"#B5562F", radius:3.4,
    flavor:"Das zweite Stadttor im Osten – der Ausgang Richtung Amalienstraße und den Rest der Stadt.",
    reward:50, rate:0.5
  }
];
