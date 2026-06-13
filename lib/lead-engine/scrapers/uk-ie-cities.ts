/** UK + Ireland cities for platform-first lead discovery. */

export type LeadEngineCity = {
  city: string;
  country: "GB" | "IE";
  postcodes: string[];
  lat: number;
  lng: number;
  slug: string;
};

const IRELAND = new Set(
  [
    "Dublin",
    "Cork",
    "Galway",
    "Limerick",
    "Waterford",
    "Kilkenny",
    "Drogheda",
    "Dundalk",
    "Swords",
    "Bray",
    "Navan",
    "Ennis",
    "Tralee",
    "Sligo",
    "Athlone",
    "Letterkenny",
    "Carlow",
    "Wexford",
    "Clonmel",
    "Mullingar",
  ].map((c) => c.toLowerCase()),
);

/** Major UK + IE cities — one+ Just Eat postcodes each. */
export const LEAD_ENGINE_CITIES: LeadEngineCity[] = [
  // England — largest first
  { city: "London", country: "GB", postcodes: ["SW1A", "E1", "N1", "SE1", "W1", "EC1", "SW11", "E14"], lat: 51.5074, lng: -0.1278, slug: "london" },
  { city: "Manchester", country: "GB", postcodes: ["M1", "M2", "M3", "M4", "M14"], lat: 53.4808, lng: -2.2426, slug: "manchester" },
  { city: "Birmingham", country: "GB", postcodes: ["B1", "B2", "B3", "B5", "B15"], lat: 52.4862, lng: -1.8904, slug: "birmingham" },
  { city: "Leeds", country: "GB", postcodes: ["LS1", "LS2", "LS6", "LS11"], lat: 53.8008, lng: -1.5491, slug: "leeds" },
  { city: "Liverpool", country: "GB", postcodes: ["L1", "L2", "L3", "L17"], lat: 53.4084, lng: -2.9916, slug: "liverpool" },
  { city: "Sheffield", country: "GB", postcodes: ["S1", "S2", "S10", "S11"], lat: 53.3811, lng: -1.4701, slug: "sheffield" },
  { city: "Bristol", country: "GB", postcodes: ["BS1", "BS2", "BS6", "BS8"], lat: 51.4545, lng: -2.5879, slug: "bristol" },
  { city: "Leicester", country: "GB", postcodes: ["LE1", "LE2", "LE3"], lat: 52.6369, lng: -1.1398, slug: "leicester" },
  { city: "Coventry", country: "GB", postcodes: ["CV1", "CV2", "CV3"], lat: 52.4068, lng: -1.5197, slug: "coventry" },
  { city: "Bradford", country: "GB", postcodes: ["BD1", "BD7"], lat: 53.795, lng: -1.7594, slug: "bradford" },
  { city: "Nottingham", country: "GB", postcodes: ["NG1", "NG2", "NG7"], lat: 52.9548, lng: -1.1581, slug: "nottingham" },
  { city: "Hull", country: "GB", postcodes: ["HU1", "HU2"], lat: 53.7457, lng: -0.3367, slug: "hull" },
  { city: "Newcastle", country: "GB", postcodes: ["NE1", "NE2", "NE4"], lat: 54.9783, lng: -1.6178, slug: "newcastle" },
  { city: "Stoke-on-Trent", country: "GB", postcodes: ["ST1", "ST4"], lat: 53.0027, lng: -2.1794, slug: "stoke-on-trent" },
  { city: "Wolverhampton", country: "GB", postcodes: ["WV1", "WV3"], lat: 52.5869, lng: -2.1288, slug: "wolverhampton" },
  { city: "Southampton", country: "GB", postcodes: ["SO14", "SO15", "SO16"], lat: 50.9097, lng: -1.4044, slug: "southampton" },
  { city: "Plymouth", country: "GB", postcodes: ["PL1", "PL4"], lat: 50.3755, lng: -4.1427, slug: "plymouth" },
  { city: "Reading", country: "GB", postcodes: ["RG1", "RG2", "RG6"], lat: 51.4543, lng: -0.9781, slug: "reading" },
  { city: "Derby", country: "GB", postcodes: ["DE1", "DE22"], lat: 52.9225, lng: -1.4746, slug: "derby" },
  { city: "Portsmouth", country: "GB", postcodes: ["PO1", "PO2"], lat: 50.8198, lng: -1.088, slug: "portsmouth" },
  { city: "Brighton", country: "GB", postcodes: ["BN1", "BN2", "BN3"], lat: 50.8225, lng: -0.1372, slug: "brighton" },
  { city: "Northampton", country: "GB", postcodes: ["NN1", "NN2"], lat: 52.2405, lng: -0.9027, slug: "northampton" },
  { city: "Luton", country: "GB", postcodes: ["LU1", "LU2"], lat: 51.8787, lng: -0.4200, slug: "luton" },
  { city: "Milton Keynes", country: "GB", postcodes: ["MK1", "MK9"], lat: 52.0406, lng: -0.7594, slug: "milton-keynes" },
  { city: "Swindon", country: "GB", postcodes: ["SN1", "SN2"], lat: 51.5558, lng: -1.7797, slug: "swindon" },
  { city: "Oxford", country: "GB", postcodes: ["OX1", "OX2", "OX4"], lat: 51.752, lng: -1.2577, slug: "oxford" },
  { city: "Cambridge", country: "GB", postcodes: ["CB1", "CB2", "CB3"], lat: 52.2053, lng: 0.1218, slug: "cambridge" },
  { city: "Norwich", country: "GB", postcodes: ["NR1", "NR2"], lat: 52.6309, lng: 1.2974, slug: "norwich" },
  { city: "Exeter", country: "GB", postcodes: ["EX1", "EX4"], lat: 50.7184, lng: -3.5339, slug: "exeter" },
  { city: "York", country: "GB", postcodes: ["YO1", "YO10"], lat: 53.959, lng: -1.0815, slug: "york" },
  { city: "Peterborough", country: "GB", postcodes: ["PE1", "PE2"], lat: 52.5695, lng: -0.2405, slug: "peterborough" },
  { city: "Bournemouth", country: "GB", postcodes: ["BH1", "BH2"], lat: 50.7192, lng: -1.8808, slug: "bournemouth" },
  { city: "Southend-on-Sea", country: "GB", postcodes: ["SS1", "SS2"], lat: 51.5459, lng: 0.7077, slug: "southend-on-sea" },
  { city: "Middlesbrough", country: "GB", postcodes: ["TS1", "TS5"], lat: 54.5742, lng: -1.235, slug: "middlesbrough" },
  { city: "Sunderland", country: "GB", postcodes: ["SR1", "SR2"], lat: 54.9069, lng: -1.3838, slug: "sunderland" },
  { city: "Wigan", country: "GB", postcodes: ["WN1", "WN3"], lat: 53.5451, lng: -2.6325, slug: "wigan" },
  { city: "Huddersfield", country: "GB", postcodes: ["HD1", "HD3"], lat: 53.6458, lng: -1.785, slug: "huddersfield" },
  { city: "Bolton", country: "GB", postcodes: ["BL1", "BL2"], lat: 53.5785, lng: -2.4299, slug: "bolton" },
  { city: "Blackpool", country: "GB", postcodes: ["FY1", "FY2"], lat: 53.8175, lng: -3.0357, slug: "blackpool" },
  { city: "Preston", country: "GB", postcodes: ["PR1", "PR2"], lat: 53.7632, lng: -2.7031, slug: "preston" },
  { city: "Colchester", country: "GB", postcodes: ["CO1", "CO2"], lat: 51.8959, lng: 0.8919, slug: "colchester" },
  { city: "Cheltenham", country: "GB", postcodes: ["GL50", "GL51"], lat: 51.8994, lng: -2.0783, slug: "cheltenham" },
  { city: "Gloucester", country: "GB", postcodes: ["GL1", "GL2"], lat: 51.8642, lng: -2.2382, slug: "gloucester" },
  { city: "Bath", country: "GB", postcodes: ["BA1", "BA2"], lat: 51.3811, lng: -2.359, slug: "bath" },
  { city: "Canterbury", country: "GB", postcodes: ["CT1", "CT2"], lat: 51.2802, lng: 1.0789, slug: "canterbury" },
  { city: "Durham", country: "GB", postcodes: ["DH1"], lat: 54.7761, lng: -1.5733, slug: "durham" },
  { city: "Carlisle", country: "GB", postcodes: ["CA1", "CA2"], lat: 54.8951, lng: -2.9382, slug: "carlisle" },
  { city: "Lancaster", country: "GB", postcodes: ["LA1"], lat: 54.0466, lng: -2.8007, slug: "lancaster" },
  { city: "Chester", country: "GB", postcodes: ["CH1", "CH2"], lat: 53.1934, lng: -2.8931, slug: "chester" },
  { city: "Shrewsbury", country: "GB", postcodes: ["SY1", "SY2"], lat: 52.7069, lng: -2.7527, slug: "shrewsbury" },
  { city: "Telford", country: "GB", postcodes: ["TF1", "TF3"], lat: 52.6766, lng: -2.4469, slug: "telford" },
  { city: "Warrington", country: "GB", postcodes: ["WA1", "WA2"], lat: 53.3900, lng: -2.5970, slug: "warrington" },
  { city: "Stockport", country: "GB", postcodes: ["SK1", "SK2"], lat: 53.4084, lng: -2.1496, slug: "stockport" },
  { city: "Oldham", country: "GB", postcodes: ["OL1", "OL2"], lat: 53.5409, lng: -2.1114, slug: "oldham" },
  { city: "Rochdale", country: "GB", postcodes: ["OL16"], lat: 53.6097, lng: -2.1561, slug: "rochdale" },
  { city: "Wakefield", country: "GB", postcodes: ["WF1", "WF2"], lat: 53.6833, lng: -1.5059, slug: "wakefield" },
  { city: "Doncaster", country: "GB", postcodes: ["DN1", "DN4"], lat: 53.5228, lng: -1.1285, slug: "doncaster" },
  { city: "Barnsley", country: "GB", postcodes: ["S70", "S71"], lat: 53.5526, lng: -1.4797, slug: "barnsley" },
  { city: "Rotherham", country: "GB", postcodes: ["S60", "S61"], lat: 53.4326, lng: -1.3635, slug: "rotherham" },
  { city: "Grimsby", country: "GB", postcodes: ["DN31", "DN32"], lat: 53.5654, lng: -0.0755, slug: "grimsby" },
  { city: "Lincoln", country: "GB", postcodes: ["LN1", "LN2"], lat: 53.2307, lng: -0.5406, slug: "lincoln" },
  { city: "Ipswich", country: "GB", postcodes: ["IP1", "IP2"], lat: 52.0567, lng: 1.1482, slug: "ipswich" },
  { city: "Watford", country: "GB", postcodes: ["WD17", "WD18"], lat: 51.6565, lng: -0.3903, slug: "watford" },
  { city: "Slough", country: "GB", postcodes: ["SL1", "SL2"], lat: 51.5105, lng: -0.595, slug: "slough" },
  { city: "Maidstone", country: "GB", postcodes: ["ME14", "ME15"], lat: 51.2704, lng: 0.5227, slug: "maidstone" },
  { city: "Crawley", country: "GB", postcodes: ["RH10", "RH11"], lat: 51.1091, lng: -0.1872, slug: "crawley" },
  { city: "Guildford", country: "GB", postcodes: ["GU1", "GU2"], lat: 51.2362, lng: -0.5704, slug: "guildford" },
  { city: "Eastbourne", country: "GB", postcodes: ["BN21", "BN22"], lat: 50.768, lng: 0.2905, slug: "eastbourne" },
  { city: "Torquay", country: "GB", postcodes: ["TQ1", "TQ2"], lat: 50.4619, lng: -3.5253, slug: "torquay" },
  { city: "Salisbury", country: "GB", postcodes: ["SP1", "SP2"], lat: 51.0693, lng: -1.7947, slug: "salisbury" },
  { city: "Winchester", country: "GB", postcodes: ["SO23"], lat: 51.0632, lng: -1.308, slug: "winchester" },
  { city: "Hereford", country: "GB", postcodes: ["HR1", "HR2"], lat: 52.0565, lng: -2.716, slug: "hereford" },
  { city: "Worcester", country: "GB", postcodes: ["WR1", "WR2"], lat: 52.1936, lng: -2.2216, slug: "worcester" },
  { city: "Nuneaton", country: "GB", postcodes: ["CV10", "CV11"], lat: 52.5234, lng: -1.4652, slug: "nuneaton" },
  { city: "Solihull", country: "GB", postcodes: ["B91", "B92"], lat: 52.4118, lng: -1.7776, slug: "solihull" },
  { city: "Dudley", country: "GB", postcodes: ["DY1", "DY2"], lat: 52.512, lng: -2.081, slug: "dudley" },
  { city: "Walsall", country: "GB", postcodes: ["WS1", "WS2"], lat: 52.586, lng: -1.982, slug: "walsall" },
  { city: "West Bromwich", country: "GB", postcodes: ["B70", "B71"], lat: 52.519, lng: -1.994, slug: "west-bromwich" },
  { city: "Harrogate", country: "GB", postcodes: ["HG1", "HG2"], lat: 53.9921, lng: -1.5418, slug: "harrogate" },
  { city: "Darlington", country: "GB", postcodes: ["DL1", "DL3"], lat: 54.527, lng: -1.5526, slug: "darlington" },
  { city: "Hartlepool", country: "GB", postcodes: ["TS24", "TS25"], lat: 54.6917, lng: -1.2129, slug: "hartlepool" },
  { city: "Gateshead", country: "GB", postcodes: ["NE8", "NE11"], lat: 54.9621, lng: -1.6019, slug: "gateshead" },
  { city: "Bury", country: "GB", postcodes: ["BL9"], lat: 53.5933, lng: -2.2986, slug: "bury" },
  { city: "St Helens", country: "GB", postcodes: ["WA10"], lat: 53.4538, lng: -2.7369, slug: "st-helens" },
  { city: "Birkenhead", country: "GB", postcodes: ["CH41", "CH42"], lat: 53.3895, lng: -3.0238, slug: "birkenhead" },
  { city: "St Albans", country: "GB", postcodes: ["AL1", "AL3"], lat: 51.752, lng: -0.336, slug: "st-albans" },
  { city: "Bedford", country: "GB", postcodes: ["MK40", "MK41"], lat: 52.1364, lng: -0.4607, slug: "bedford" },
  { city: "Kettering", country: "GB", postcodes: ["NN15", "NN16"], lat: 52.3963, lng: -0.7303, slug: "kettering" },
  { city: "Rugby", country: "GB", postcodes: ["CV21", "CV22"], lat: 52.3709, lng: -1.265, slug: "rugby" },
  { city: "Scarborough", country: "GB", postcodes: ["YO11", "YO12"], lat: 54.2797, lng: -0.4044, slug: "scarborough" },
  { city: "Burnley", country: "GB", postcodes: ["BB10", "BB11"], lat: 53.7893, lng: -2.2405, slug: "burnley" },
  { city: "Blackburn", country: "GB", postcodes: ["BB1", "BB2"], lat: 53.7488, lng: -2.4828, slug: "blackburn" },
  { city: "Basildon", country: "GB", postcodes: ["SS14", "SS15"], lat: 51.5761, lng: 0.4887, slug: "basildon" },
  { city: "High Wycombe", country: "GB", postcodes: ["HP11", "HP12"], lat: 51.6287, lng: -0.7482, slug: "high-wycombe" },
  { city: "Worthing", country: "GB", postcodes: ["BN11", "BN14"], lat: 50.818, lng: -0.375, slug: "worthing" },
  { city: "Chelmsford", country: "GB", postcodes: ["CM1", "CM2"], lat: 51.7356, lng: 0.4685, slug: "chelmsford" },
  { city: "Poole", country: "GB", postcodes: ["BH15", "BH16"], lat: 50.715, lng: -1.9872, slug: "poole" },
  { city: "Mansfield", country: "GB", postcodes: ["NG18", "NG19"], lat: 53.1445, lng: -1.1964, slug: "mansfield" },
  { city: "Chesterfield", country: "GB", postcodes: ["S40", "S41"], lat: 53.235, lng: -1.421, slug: "chesterfield" },
  { city: "Crewe", country: "GB", postcodes: ["CW1", "CW2"], lat: 53.099, lng: -2.440, slug: "crewe" },
  { city: "Aylesbury", country: "GB", postcodes: ["HP19", "HP20"], lat: 51.8167, lng: -0.812, slug: "aylesbury" },
  { city: "Taunton", country: "GB", postcodes: ["TA1", "TA2"], lat: 51.015, lng: -3.102, slug: "taunton" },
  { city: "Truro", country: "GB", postcodes: ["TR1"], lat: 50.2632, lng: -5.051, slug: "truro" },
  { city: "Chichester", country: "GB", postcodes: ["PO19"], lat: 50.8365, lng: -0.7792, slug: "chichester" },
  // Scotland
  { city: "Glasgow", country: "GB", postcodes: ["G1", "G2", "G3", "G12"], lat: 55.8642, lng: -4.2518, slug: "glasgow" },
  { city: "Edinburgh", country: "GB", postcodes: ["EH1", "EH2", "EH3", "EH10"], lat: 55.9533, lng: -3.1883, slug: "edinburgh" },
  { city: "Aberdeen", country: "GB", postcodes: ["AB10", "AB11"], lat: 57.1497, lng: -2.0943, slug: "aberdeen" },
  { city: "Dundee", country: "GB", postcodes: ["DD1", "DD2"], lat: 56.462, lng: -2.9707, slug: "dundee" },
  { city: "Inverness", country: "GB", postcodes: ["IV1", "IV2"], lat: 57.4778, lng: -4.2247, slug: "inverness" },
  { city: "Stirling", country: "GB", postcodes: ["FK8", "FK9"], lat: 56.1165, lng: -3.9369, slug: "stirling" },
  { city: "Perth", country: "GB", postcodes: ["PH1", "PH2"], lat: 56.395, lng: -3.4308, slug: "perth" },
  { city: "Paisley", country: "GB", postcodes: ["PA1", "PA2"], lat: 55.8473, lng: -4.4401, slug: "paisley" },
  { city: "Kirkcaldy", country: "GB", postcodes: ["KY1", "KY2"], lat: 56.111, lng: -3.159, slug: "kirkcaldy" },
  { city: "Dunfermline", country: "GB", postcodes: ["KY11", "KY12"], lat: 56.0719, lng: -3.4393, slug: "dunfermline" },
  { city: "Ayr", country: "GB", postcodes: ["KA7", "KA8"], lat: 55.458, lng: -4.629, slug: "ayr" },
  { city: "Falkirk", country: "GB", postcodes: ["FK1", "FK2"], lat: 56.0019, lng: -3.7839, slug: "falkirk" },
  { city: "Livingston", country: "GB", postcodes: ["EH54"], lat: 55.886, lng: -3.522, slug: "livingston" },
  // Wales
  { city: "Cardiff", country: "GB", postcodes: ["CF10", "CF11", "CF24"], lat: 51.4816, lng: -3.1791, slug: "cardiff" },
  { city: "Swansea", country: "GB", postcodes: ["SA1", "SA2"], lat: 51.6214, lng: -3.9436, slug: "swansea" },
  { city: "Newport", country: "GB", postcodes: ["NP20", "NP19"], lat: 51.5842, lng: -2.9977, slug: "newport" },
  { city: "Wrexham", country: "GB", postcodes: ["LL11", "LL12"], lat: 53.046, lng: -2.993, slug: "wrexham" },
  { city: "Barry", country: "GB", postcodes: ["CF62", "CF63"], lat: 51.399, lng: -3.283, slug: "barry" },
  { city: "Neath", country: "GB", postcodes: ["SA10", "SA11"], lat: 51.662, lng: -3.807, slug: "neath" },
  { city: "Bridgend", country: "GB", postcodes: ["CF31", "CF32"], lat: 51.504, lng: -3.576, slug: "bridgend" },
  { city: "Bangor", country: "GB", postcodes: ["LL57"], lat: 53.227, lng: -4.129, slug: "bangor" },
  { city: "Aberystwyth", country: "GB", postcodes: ["SY23"], lat: 52.415, lng: -4.082, slug: "aberystwyth" },
  // Northern Ireland
  { city: "Belfast", country: "GB", postcodes: ["BT1", "BT2", "BT7"], lat: 54.5973, lng: -5.9301, slug: "belfast" },
  { city: "Derry", country: "GB", postcodes: ["BT48", "BT47"], lat: 54.9966, lng: -7.3086, slug: "derry" },
  { city: "Lisburn", country: "GB", postcodes: ["BT28"], lat: 54.516, lng: -6.058, slug: "lisburn" },
  { city: "Newry", country: "GB", postcodes: ["BT34", "BT35"], lat: 54.175, lng: -6.337, slug: "newry" },
  { city: "Bangor (NI)", country: "GB", postcodes: ["BT20"], lat: 54.653, lng: -5.669, slug: "bangor-ni" },
  // Ireland
  { city: "Dublin", country: "IE", postcodes: ["D01", "D02", "D04", "D08"], lat: 53.3498, lng: -6.2603, slug: "dublin" },
  { city: "Cork", country: "IE", postcodes: ["T12", "T23"], lat: 51.8985, lng: -8.4756, slug: "cork" },
  { city: "Galway", country: "IE", postcodes: ["H91"], lat: 53.2707, lng: -9.0568, slug: "galway" },
  { city: "Limerick", country: "IE", postcodes: ["V94"], lat: 52.6638, lng: -8.6267, slug: "limerick" },
  { city: "Waterford", country: "IE", postcodes: ["X91"], lat: 52.2593, lng: -7.1101, slug: "waterford" },
  { city: "Kilkenny", country: "IE", postcodes: ["R95"], lat: 52.6541, lng: -7.2448, slug: "kilkenny" },
  { city: "Drogheda", country: "IE", postcodes: ["A92"], lat: 53.7189, lng: -6.3478, slug: "drogheda" },
  { city: "Dundalk", country: "IE", postcodes: ["A91"], lat: 54.0, lng: -6.4167, slug: "dundalk" },
  { city: "Swords", country: "IE", postcodes: ["K67"], lat: 53.4597, lng: -6.2181, slug: "swords" },
  { city: "Bray", country: "IE", postcodes: ["A98"], lat: 53.2028, lng: -6.1113, slug: "bray" },
  { city: "Navan", country: "IE", postcodes: ["C15"], lat: 53.6528, lng: -6.6814, slug: "navan" },
  { city: "Ennis", country: "IE", postcodes: ["V95"], lat: 52.8436, lng: -8.9864, slug: "ennis" },
  { city: "Tralee", country: "IE", postcodes: ["V92"], lat: 52.2713, lng: -9.7026, slug: "tralee" },
  { city: "Sligo", country: "IE", postcodes: ["F91"], lat: 54.2766, lng: -8.4761, slug: "sligo" },
  { city: "Athlone", country: "IE", postcodes: ["N37"], lat: 53.4239, lng: -7.9407, slug: "athlone" },
  { city: "Letterkenny", country: "IE", postcodes: ["F92"], lat: 54.953, lng: -7.733, slug: "letterkenny" },
  { city: "Carlow", country: "IE", postcodes: ["R93"], lat: 52.8365, lng: -6.9341, slug: "carlow" },
  { city: "Wexford", country: "IE", postcodes: ["Y35"], lat: 52.3369, lng: -6.4633, slug: "wexford" },
  { city: "Clonmel", country: "IE", postcodes: ["E91"], lat: 52.3558, lng: -7.7039, slug: "clonmel" },
  { city: "Mullingar", country: "IE", postcodes: ["N91"], lat: 53.5259, lng: -7.3381, slug: "mullingar" },
];

/** Dedupe by city name (Stoke-on-Trent listed twice in source — keep first). */
const BY_CITY = new Map<string, LeadEngineCity>();
for (const row of LEAD_ENGINE_CITIES) {
  if (!BY_CITY.has(row.city)) BY_CITY.set(row.city, row);
}

export const ALL_LEAD_ENGINE_CITIES = [...BY_CITY.values()];

export function leadEngineCityNames(): string[] {
  return ALL_LEAD_ENGINE_CITIES.map((c) => c.city);
}

export function leadEngineCityByName(city: string): LeadEngineCity | undefined {
  return BY_CITY.get(city);
}

export function isIrelandCity(city: string): boolean {
  return IRELAND.has(city.toLowerCase()) || BY_CITY.get(city)?.country === "IE";
}
