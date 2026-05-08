import React, { createContext, useContext, useMemo, ReactNode } from "react";

const LOGO_MAP: Record<string, string> = {
  "Institut Pertanian Bogor": "https://iili.io/fmzRolt.png",
  "Institut Teknologi Bacharuddin Jusuf Habibie": "https://iili.io/fmfJy74.png",
  "Institut Teknologi Bandung": "https://iili.io/fmfFTj2.png",
  "Institut Teknologi Kalimantan": "https://iili.io/fmfBAAb.png",
  "Institut Teknologi Sepuluh November": "https://iili.io/fmfoJcP.png",
  "Institut Teknologi Sumatera": "https://iili.io/fmzj8P9.png",
  "ISBI Aceh": "https://iili.io/fmzk8YX.png",
  "ISBI Bandung": "https://iili.io/fmzgzOX.png",
  "ISI-Denpasar": "https://iili.io/fmzif8Q.png",
  "ISI-PadangPanjang": "https://iili.io/fmztcCP.png",
  "ISI-Surakarta": "https://iili.io/fmzmpAG.png",
  "ISI-Yogjakarta": "https://iili.io/fmI9rAu.png",
  "Politeknik Elektronika Negeri Surabaya": "https://iili.io/fmI2Xg2.png",
  "Politeknik Manufaktur Bandung": "https://iili.io/fmIqePs.png",
  "Politeknik Manufaktur Negeri Bangka Belitung": "https://iili.io/fmIu9MN.png",
  "Politeknik Negeri Bali": "https://iili.io/fmI1zI1.png",
  "Politeknik Negeri Bandung": "https://iili.io/fmIVOKu.png",
  "Politeknik Negeri Banyuwangi": "https://iili.io/fmIhkSs.png",
  "Politeknik Negeri Batam": "https://iili.io/fmIeops.png",
  "Politeknik Negeri Bengkalis": "https://iili.io/fmIvm2S.png",
  "Politeknik Negeri Cilacap": "https://iili.io/fmISmbe.png",
  "Politeknik Negeri Indramayu": "https://iili.io/fmIgmMb.png",
  "Politeknik Negeri Jakarta": "https://iili.io/fmIP2Hl.png",
  "Politeknik Negeri Jember": "https://iili.io/fmILM5x.png",
  "Politeknik Negeri Lampung": "https://iili.io/fmIDBpf.png",
  "Politeknik Negeri Lhokseumawe": "https://iili.io/fmT9zgI.png",
  "Politeknik Negeri Malang": "https://iili.io/fmTdx0Q.png",
  "Politeknik Negeri Medan": "https://iili.io/fmTFCss.png",
  "Politeknik Negeri Media Kreatif": "https://iili.io/fmTnlB1.png",
  "Politeknik Negeri Padang": "https://iili.io/fmTz6jR.png",
  "Politeknik Negeri Semarang": "https://iili.io/fmTaz4R.png",
  "Politeknik Negeri Sriwijaya": "https://iili.io/fmTlAzX.png",
  "Politeknik Perkapalan Negeri Surabaya": "https://iili.io/fmTjRyb.png",
  "Politeknik Pertanian Negeri Payakumbuh": "https://iili.io/fmT87g2.png",
  "UIN Imam Bonjol Padang": "https://iili.io/fmT4GKG.png",
  "UIN Alauddin Makasar": "https://iili.io/fmTQ9oB.png",
  "UIN Datokarama Palu": "https://iili.io/fmTmaGp.png",
  "UIN Maulana Malik Ibrahim Malang": "https://iili.io/fmuHBOF.png",
  "UIN Raden Fatah Palembang": "https://iili.io/fmu3tjt.png",
  "UIN Raden Mas Said Surakarta": "https://iili.io/fmuB75v.png",
  "UIN Sultan Maulana Hasanuddin Banten": "https://iili.io/fmuzRNj.png",
  "UIN Sultan Syarif Kasim Riau": "https://iili.io/fmuRwFV.png",
  "UIN Sulthan Thaha Saifuddin Jambi": "https://iili.io/fmuaJlR.png",
  "UIN Sumatera Utara Medan": "https://iili.io/fmu0vgj.png",
  "UIN Sunan Ampel Surabaya": "https://iili.io/fmuGfb2.png",
  "UIN Sunan Gunung Djati Bandung": "https://iili.io/fmuXCpj.png",
  "UIN Sunan kalijaga Yogyakarta": "https://iili.io/fmuOmv9.png",
  "UIN Syarif Hidayatullah Jakarta": "https://iili.io/fmuPCfn.png",
  "UIN Walisong Semarang": "https://iili.io/fmusNHJ.png",
  "Universitas Airlangga": "https://iili.io/fmuQwjR.png",
  "Universitas Andalas": "https://iili.io/fmuD321.png",
  "Universitas Bangka Belitung": "https://iili.io/fmub8xf.png",
  "Universitas Bengkulu": "https://iili.io/fmAdGkB.png",
  "Universitas Borneo Tarakan": "https://iili.io/fmAqk2s.png",
  "Universitas Brawijaya": "https://iili.io/fmAuO4p.png",
  "Universitas Cendrawasih": "https://iili.io/fmAQFHu.png",
  "Universitas Diponegoro": "https://iili.io/fmAD9Pp.png",
  "Universitas Gadjah Mada": "https://iili.io/fmAplsf.png",
  "Universitas Gajah Mada": "https://iili.io/fmAplsf.png",
  "Universitas Halu Oleo": "https://iili.io/fmR9vHB.png",
  "Universitas Hasanuddin": "https://iili.io/fmRFvHv.png",
  "Universitas Indonesia": "https://iili.io/fmRqcKX.png",
  "Universitas Islam Negeri Ar-Raniry": "https://iili.io/fmRCQwv.png",
  "Universitas Jambi": "https://iili.io/fmRzllS.png",
  "Universitas Jember": "https://iili.io/fmRR6cQ.png",
  "Universitas Jendral Soedirman": "https://iili.io/fmRYHuI.png",
  "Universitas Jenderal Soedirman": "https://iili.io/fmRYHuI.png",
  "Universitas Khairun": "https://iili.io/fmRcCIS.png",
  "Universitas Lambung Mangkurat": "https://iili.io/fmR1lQS.png",
  "Universitas Lampung": "https://iili.io/fmRM867.png",
  "Universitas Malikussaleh": "https://iili.io/fmROOEx.png",
  "Universitas Maritim Raja Ali Haji": "https://iili.io/fmRUqXt.png",
  "Universitas Mataram": "https://iili.io/fmRre5v.png",
  "Universitas Mulawarman": "https://iili.io/fmRPPrF.png",
  "Universitas Musamus": "https://iili.io/fmRLUX4.png",
  "Universitas Negeri Gorontalo": "https://iili.io/fmRtUhJ.png",
  "Universitas Negeri Jakarta": "https://iili.io/fmRm6Ex.png",
  "Universitas Negeri Makassar": "https://iili.io/fm59Kss.png",
  "Universitas Negeri Malang": "https://iili.io/fm5dLYv.png",
  "Universitas Negeri Manado": "https://iili.io/fm5Fodb.png",
  "Universitas Negeri Medan": "https://iili.io/fm5fP5b.png",
  "Universitas Negeri Padang": "https://iili.io/fm5CW0P.png",
  "Universitas Negeri Semarang": "https://iili.io/fm5InoJ.png",
  "Universitas Negeri Surabaya": "https://iili.io/fm5uyns.png",
  "Universitas Negeri Yogyakarta": "https://iili.io/fm554ne.png",
  "Universitas Nusa Cendana": "https://iili.io/fm5cTla.png",
  "Universitas Nusa Cenda": "https://iili.io/fm5cTla.png",
  "Universitas Padjadjaran": "https://iili.io/fm5MNzx.png",
  "Universitas Padjajaran": "https://iili.io/fm5MNzx.png",
  "Universitas Palangkaraya": "https://iili.io/fm5kkuI.png",
  "Universitas Palangka Raya": "https://iili.io/fm5kkuI.png",
  "Universitas Papua": "https://iili.io/fm5SEjS.png",
  "Universitas Pattimura": "https://iili.io/fm5gRdG.png",
  "Universitas Pembangunan Nasional Veteran Jawa Timur": "https://iili.io/fm5izUF.png",
  "Universitas Pembangunan Veteran Jawa timur": "https://iili.io/fm5izUF.png",
  "Universitas Pembangunan Nasional Veteran Jakarta": "https://iili.io/fm5Z21V.png",
  "Universitas Pembangunan Veteran Jakarta": "https://iili.io/fm5Z21V.png",
  "Universitas Pembangunan Nasional Veteran Yogyakarta": "https://iili.io/fm5bjpt.png",
  "Universitas Pembangunan Veteran yogyakarta": "https://iili.io/fm5bjpt.png",
  "Universitas Pendidikan Ganesha": "https://iili.io/fm5ytGs.png",
  "Universitas Pendidikan Indonesia": "https://iili.io/fm7dnSf.png",
  "Universitas Riau": "https://iili.io/fm73HQI.png",
  "Universitas Sam Ratulangi": "https://iili.io/fm7KDYu.png",
  "Universitas Samudra": "https://iili.io/fm7zbzg.png",
  "Universitas Sebelas Maret": "https://iili.io/fm7uXsa.png",
  "Universitas Sebalas Maret": "https://iili.io/fm7uXsa.png",
  "Universitas Sembilanbelas November Kolaka": "https://iili.io/fm77Saf.png",
  "Universitas Siliwangi": "https://iili.io/fm7laHJ.png",
  "Universitas Singaperbangsa Karawang": "https://iili.io/fm7MbS9.png",
  "Universitas Sriwijaya": "https://iili.io/fm78PDB.png",
  "Universitas Sulawesi Barat": "https://iili.io/fm76UUF.png",
  "Universitas Sultan Ageng Tirtayasa": "https://iili.io/fm7sPDb.png",
  "Universitas Sumatera Utara": "https://iili.io/fm7t51R.png",
  "Universitas Syiah Kuala": "https://iili.io/fm7mWBa.png",
  "Universitas Syah Kuala": "https://iili.io/fm7mWBa.png",
  "Universitas Tadulako": "https://iili.io/fmY9epV.png",
  "Universitas Tanjungpura": "https://iili.io/fmYdP3u.png",
  "Universitas Teuku Umar": "https://iili.io/fmYf3lt.png",
  "Universitas Tidar Magelang": "https://iili.io/fmYBjov.png",
  "Universitas Tidar": "https://iili.io/fmYBjov.png",
  "Universitas Timor": "https://iili.io/fmYnlv1.png",
  "Universitas Trunojoyo Madura": "https://iili.io/fmYzNaV.png",
  "Universitas Trunojoyo": "https://iili.io/fmYzNaV.png",
  "Universitas Udayana": "https://iili.io/fmYuITP.png",
  // Alias umum
  "IPB": "https://iili.io/fmzRolt.png",
  "IPB University": "https://iili.io/fmzRolt.png",
  "ITB": "https://iili.io/fmfFTj2.png",
  "ITS": "https://iili.io/fmfoJcP.png",
  "UI": "https://iili.io/fmRqcKX.png",
  "UGM": "https://iili.io/fmAplsf.png",
  "UNAIR": "https://iili.io/fmuQwjR.png",
  "UB": "https://iili.io/fmAuO4p.png",
  "UNDIP": "https://iili.io/fmAD9Pp.png",
  "UNPAD": "https://iili.io/fm5MNzx.png",
  "UNS": "https://iili.io/fm7uXsa.png",
  "UNHAS": "https://iili.io/fmRFvHv.png",
  "USU": "https://iili.io/fm7t51R.png",
  "UPI": "https://iili.io/fm7dnSf.png",
  "UNJ": "https://iili.io/fmRm6Ex.png",
  "UNY": "https://iili.io/fm554ne.png",
  "UNNES": "https://iili.io/fm5InoJ.png",
  "UNESA": "https://iili.io/fm5uyns.png",
  "UM": "https://iili.io/fm5dLYv.png",
  "UNAND": "https://iili.io/fmuD321.png",
  "UNILA": "https://iili.io/fmRM867.png",
  "UNSRI": "https://iili.io/fm78PDB.png",
  "UNUD": "https://iili.io/fmYuITP.png",
  "UNSRAT": "https://iili.io/fm7KDYu.png",
  "UNMUL": "https://iili.io/fmRPPrF.png",
  "UNTAN": "https://iili.io/fmYdP3u.png",
  "UNRAM": "https://iili.io/fmRre5v.png",
  "UNPATTI": "https://iili.io/fm5gRdG.png",
  "UNM": "https://iili.io/fm59Kss.png",
  "UNEJ": "https://iili.io/fmRR6cQ.png",
  "USK": "https://iili.io/fm7mWBa.png",
  "UNSYIAH": "https://iili.io/fm7mWBa.png",
  "UNRI": "https://iili.io/fm73HQI.png",
  "UNJA": "https://iili.io/fmRzllS.png",
  "UNIB": "https://iili.io/fmAdGkB.png",
  "UNP": "https://iili.io/fm5CW0P.png",
  "UPR": "https://iili.io/fm5kkuI.png",
  "ULM": "https://iili.io/fmR1lQS.png",
  "POLBAN": "https://iili.io/fmIVOKu.png",
  "UNG": "https://iili.io/fmRtUhJ.png",
  "UHO": "https://iili.io/fmR9vHB.png",
  "UNCEN": "https://iili.io/fmAQFHu.png",
  "UNIMA": "https://iili.io/fm5Fodb.png",
  "UNSOED": "https://iili.io/fmRYHuI.png",
};

const LOGO_MAP_LOWER: Record<string, string> = {};
Object.entries(LOGO_MAP).forEach(([key, value]) => {
  LOGO_MAP_LOWER[key.toLowerCase()] = value;
});

interface LogoContextValue {
  logos: Record<string, string | null>;
  fetchLogos: (names: string[]) => void;
  getLogoUrl: (name: string) => string | null;
}

const LogoContext = createContext<LogoContextValue | null>(null);

function findLogo(name: string): string | null {
  if (!name) return null;
  if (LOGO_MAP[name]) return LOGO_MAP[name];
  const lower = name.toLowerCase();
  if (LOGO_MAP_LOWER[lower]) return LOGO_MAP_LOWER[lower];
  for (const [key, url] of Object.entries(LOGO_MAP_LOWER)) {
    if (key.includes(lower) || lower.includes(key)) return url;
  }
  return null;
}

export function UniversityLogoProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({
    logos: LOGO_MAP,
    fetchLogos: (_names: string[]) => {},
    getLogoUrl: (name: string): string | null => findLogo(name),
  }), []);

  return (
    <LogoContext.Provider value={value}>
      {children}
    </LogoContext.Provider>
  );
}

export function useUniversityLogos() {
  const ctx = useContext(LogoContext);
  if (!ctx) throw new Error("useUniversityLogos must be used within UniversityLogoProvider");
  return ctx;
}
