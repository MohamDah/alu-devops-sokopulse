// Illustrative seed data in RWF per kg. "previous" is last week's wholesale price, used for trends.
const rows = [
  // commodity,        market,             wholesale, retail, previous
  ['Maize',            'Kimironko-Kigali', 450, 560, 440],
  ['Maize',            'Musanze',          410, 520, 420],
  ['Maize',            'Rubavu',           395, 500, 400],
  ['Maize',            'Huye',             430, 540, 430],
  ['Red Beans',        'Kimironko-Kigali', 1200, 1450, 1150],
  ['Red Beans',        'Musanze',          1100, 1350, 1120],
  ['Red Beans',        'Rubavu',           1050, 1300, 1040],
  ['Red Beans',        'Huye',             1150, 1400, 1150],
  ['Irish Potatoes',   'Kimironko-Kigali', 380, 480, 360],
  ['Irish Potatoes',   'Musanze',          300, 400, 310],
  ['Irish Potatoes',   'Rubavu',           320, 420, 325],
  ['Irish Potatoes',   'Huye',             350, 450, 340],
  ['Cassava',          'Kimironko-Kigali', 300, 400, 290],
  ['Cassava',          'Musanze',          280, 370, 285],
  ['Cassava',          'Rubavu',           270, 360, 265],
  ['Cassava',          'Huye',             310, 420, 300],
  ['Rice',             'Kimironko-Kigali', 1250, 1500, 1230],
  ['Rice',             'Musanze',          1180, 1420, 1190],
  ['Rice',             'Rubavu',           1150, 1400, 1140],
  ['Rice',             'Huye',             1200, 1450, 1210],
];

module.exports = rows.map(([commodity, market, wholesalePrice, retailPrice, previousWholesalePrice]) => ({
  commodity,
  market,
  currency: 'RWF',
  wholesalePrice,
  retailPrice,
  previousWholesalePrice,
}));
