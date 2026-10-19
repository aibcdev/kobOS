/**
 * ISO 3166-1 alpha-2 country → ISO 4217 currency, so every restaurant reports in its own money. Countries not
 * listed (or codes we don't recognise) report in USD; GBP is only for the UK, and for restaurants whose country
 * isn't known yet (KOB's home market).
 */
const BY_CURRENCY: Record<string, string> = {
  USD: "US AS BQ EC FM GU IO MH MP PR PW SV TC TL UM VG VI ZW",
  EUR: "AD AT AX BE BL CY DE EE ES FI FR GF GP GR HR IE IT LT LU LV MC ME MF MQ MT NL PM PT RE SI SK SM TF VA XK YT",
  GBP: "GB GG IM JE GS",
  CAD: "CA",
  AUD: "AU CX CC HM KI NF NR TV",
  NZD: "NZ CK NU PN TK",
  CHF: "CH LI",
  NOK: "NO SJ BV",
  DKK: "DK FO GL",
  XCD: "AG AI DM GD KN LC MS VC",
  XOF: "BF BJ CI GW ML NE SN TG",
  XAF: "CF CG CM GA GQ TD",
  XPF: "NC PF WF",
  ANG: "CW SX",
  MAD: "EH MA",
  INR: "BT IN",
  ZAR: "LS NA ZA",
  ILS: "IL PS",
  AED: "AE", AFN: "AF", ALL: "AL", AMD: "AM", AOA: "AO", ARS: "AR", AWG: "AW", AZN: "AZ", BAM: "BA", BBD: "BB",
  BDT: "BD", BGN: "BG", BHD: "BH", BIF: "BI", BMD: "BM", BND: "BN", BOB: "BO", BRL: "BR", BSD: "BS", BWP: "BW",
  BYN: "BY", BZD: "BZ", CDF: "CD", CLP: "CL", CNY: "CN", COP: "CO", CRC: "CR", CUP: "CU", CVE: "CV", CZK: "CZ",
  DJF: "DJ", DOP: "DO", DZD: "DZ", EGP: "EG", ERN: "ER", ETB: "ET", FJD: "FJ", FKP: "FK", GEL: "GE", GHS: "GH",
  GIP: "GI", GMD: "GM", GNF: "GN", GTQ: "GT", GYD: "GY", HKD: "HK", HNL: "HN", HTG: "HT", HUF: "HU", IDR: "ID",
  IQD: "IQ", IRR: "IR", ISK: "IS", JMD: "JM", JOD: "JO", JPY: "JP", KES: "KE", KGS: "KG", KHR: "KH", KMF: "KM",
  KPW: "KP", KRW: "KR", KWD: "KW", KYD: "KY", KZT: "KZ", LAK: "LA", LBP: "LB", LKR: "LK", LRD: "LR", LYD: "LY",
  MDL: "MD", MGA: "MG", MKD: "MK", MMK: "MM", MNT: "MN", MOP: "MO", MRU: "MR", MUR: "MU", MVR: "MV", MWK: "MW",
  MXN: "MX", MYR: "MY", MZN: "MZ", NGN: "NG", NIO: "NI", NPR: "NP", OMR: "OM", PAB: "PA", PEN: "PE", PGK: "PG",
  PHP: "PH", PKR: "PK", PLN: "PL", PYG: "PY", QAR: "QA", RON: "RO", RSD: "RS", RUB: "RU", RWF: "RW", SAR: "SA",
  SBD: "SB", SCR: "SC", SDG: "SD", SEK: "SE", SGD: "SG", SHP: "SH", SLE: "SL", SOS: "SO", SRD: "SR", SSP: "SS",
  STN: "ST", SYP: "SY", SZL: "SZ", THB: "TH", TJS: "TJ", TMT: "TM", TND: "TN", TOP: "TO", TRY: "TR", TTD: "TT",
  TWD: "TW", TZS: "TZ", UAH: "UA", UGX: "UG", UYU: "UY", UZS: "UZ", VES: "VE", VND: "VN", VUV: "VU", WST: "WS",
  YER: "YE", ZMW: "ZM",
};

export const COUNTRY_CURRENCY: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(Object.entries(BY_CURRENCY).flatMap(([currency, countries]) => countries.split(" ").map((c) => [c, currency]))),
);

export const HOME_CURRENCY = "GBP";
export const FALLBACK_CURRENCY = "USD";

export function currencyForCountry(countryCode: string | null | undefined): string {
  const c = countryCode?.trim().toUpperCase();
  if (!c) return HOME_CURRENCY;
  return COUNTRY_CURRENCY[c] ?? FALLBACK_CURRENCY;
}
