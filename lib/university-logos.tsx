import React, { createContext, useContext, useMemo, ReactNode } from "react";

const LOGO_MAP: Record<string, string> = {
  // Universitas Indonesia
  "Universitas Indonesia": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Logo_Universitas_Indonesia.svg/200px-Logo_Universitas_Indonesia.svg.png",
  "UI": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Logo_Universitas_Indonesia.svg/200px-Logo_Universitas_Indonesia.svg.png",

  // Institut Teknologi Bandung
  "Institut Teknologi Bandung": "https://upload.wikimedia.org/wikipedia/id/thumb/7/73/Institut_Teknologi_Bandung_Logo.svg/200px-Institut_Teknologi_Bandung_Logo.svg.png",
  "ITB": "https://upload.wikimedia.org/wikipedia/id/thumb/7/73/Institut_Teknologi_Bandung_Logo.svg/200px-Institut_Teknologi_Bandung_Logo.svg.png",

  // Universitas Gadjah Mada
  "Universitas Gadjah Mada": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Logo_Universitas_Gadjah_Mada.svg/200px-Logo_Universitas_Gadjah_Mada.svg.png",
  "UGM": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Logo_Universitas_Gadjah_Mada.svg/200px-Logo_Universitas_Gadjah_Mada.svg.png",

  // Institut Pertanian Bogor
  "Institut Pertanian Bogor": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/IPB_University_logo.svg/200px-IPB_University_logo.svg.png",
  "IPB University": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/IPB_University_logo.svg/200px-IPB_University_logo.svg.png",
  "IPB": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/IPB_University_logo.svg/200px-IPB_University_logo.svg.png",

  // Institut Teknologi Sepuluh Nopember
  "Institut Teknologi Sepuluh Nopember": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Institut_Teknologi_Sepuluh_Nopember_logo.svg/200px-Institut_Teknologi_Sepuluh_Nopember_logo.svg.png",
  "ITS": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Institut_Teknologi_Sepuluh_Nopember_logo.svg/200px-Institut_Teknologi_Sepuluh_Nopember_logo.svg.png",

  // Universitas Airlangga
  "Universitas Airlangga": "https://upload.wikimedia.org/wikipedia/id/thumb/e/e1/Logo_Universitas_Airlangga.svg/200px-Logo_Universitas_Airlangga.svg.png",
  "UNAIR": "https://upload.wikimedia.org/wikipedia/id/thumb/e/e1/Logo_Universitas_Airlangga.svg/200px-Logo_Universitas_Airlangga.svg.png",

  // Universitas Diponegoro
  "Universitas Diponegoro": "https://upload.wikimedia.org/wikipedia/id/thumb/9/9d/UNDIP.png/200px-UNDIP.png",
  "UNDIP": "https://upload.wikimedia.org/wikipedia/id/thumb/9/9d/UNDIP.png/200px-UNDIP.png",

  // Universitas Brawijaya
  "Universitas Brawijaya": "https://upload.wikimedia.org/wikipedia/id/thumb/7/7b/Logo_Universitas_Brawijaya_normal.svg/200px-Logo_Universitas_Brawijaya_normal.svg.png",
  "UB": "https://upload.wikimedia.org/wikipedia/id/thumb/7/7b/Logo_Universitas_Brawijaya_normal.svg/200px-Logo_Universitas_Brawijaya_normal.svg.png",

  // Universitas Padjadjaran
  "Universitas Padjadjaran": "https://upload.wikimedia.org/wikipedia/id/thumb/2/21/Lambang_Universitas_Padjadjaran.svg/200px-Lambang_Universitas_Padjadjaran.svg.png",
  "UNPAD": "https://upload.wikimedia.org/wikipedia/id/thumb/2/21/Lambang_Universitas_Padjadjaran.svg/200px-Lambang_Universitas_Padjadjaran.svg.png",

  // Universitas Sebelas Maret
  "Universitas Sebelas Maret": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Universitas_Sebelas_Maret_new_logo.svg/200px-Universitas_Sebelas_Maret_new_logo.svg.png",
  "UNS": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Universitas_Sebelas_Maret_new_logo.svg/200px-Universitas_Sebelas_Maret_new_logo.svg.png",

  // Universitas Hasanuddin
  "Universitas Hasanuddin": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/UNHAS_Logo.svg/200px-UNHAS_Logo.svg.png",
  "UNHAS": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/UNHAS_Logo.svg/200px-UNHAS_Logo.svg.png",

  // Universitas Sumatera Utara
  "Universitas Sumatera Utara": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Logo_Universitas_Sumatera_Utara.svg/200px-Logo_Universitas_Sumatera_Utara.svg.png",
  "USU": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Logo_Universitas_Sumatera_Utara.svg/200px-Logo_Universitas_Sumatera_Utara.svg.png",

  // Universitas Pendidikan Indonesia
  "Universitas Pendidikan Indonesia": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Universitas_Pendidikan_Indonesia_Logo.svg/200px-Universitas_Pendidikan_Indonesia_Logo.svg.png",
  "UPI": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Universitas_Pendidikan_Indonesia_Logo.svg/200px-Universitas_Pendidikan_Indonesia_Logo.svg.png",

  // Universitas Negeri Jakarta
  "Universitas Negeri Jakarta": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Logo_UNJ_baru.svg/200px-Logo_UNJ_baru.svg.png",
  "UNJ": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Logo_UNJ_baru.svg/200px-Logo_UNJ_baru.svg.png",

  // Universitas Negeri Yogyakarta
  "Universitas Negeri Yogyakarta": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Logo_UNY.svg/200px-Logo_UNY.svg.png",
  "UNY": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Logo_UNY.svg/200px-Logo_UNY.svg.png",

  // Universitas Negeri Semarang
  "Universitas Negeri Semarang": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Universitas_Negeri_Semarang_logo.svg/200px-Universitas_Negeri_Semarang_logo.svg.png",
  "UNNES": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Universitas_Negeri_Semarang_logo.svg/200px-Universitas_Negeri_Semarang_logo.svg.png",

  // Universitas Negeri Surabaya
  "Universitas Negeri Surabaya": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Logo_Unesa.svg/200px-Logo_Unesa.svg.png",
  "UNESA": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Logo_Unesa.svg/200px-Logo_Unesa.svg.png",

  // Universitas Negeri Malang
  "Universitas Negeri Malang": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/UM_Logo.svg/200px-UM_Logo.svg.png",
  "UM": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/UM_Logo.svg/200px-UM_Logo.svg.png",

  // Universitas Andalas
  "Universitas Andalas": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Lambang_Universitas_Andalas.svg/200px-Lambang_Universitas_Andalas.svg.png",
  "UNAND": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Lambang_Universitas_Andalas.svg/200px-Lambang_Universitas_Andalas.svg.png",

  // Universitas Lampung
  "Universitas Lampung": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Lambang_Universitas_Lampung.svg/200px-Lambang_Universitas_Lampung.svg.png",
  "UNILA": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Lambang_Universitas_Lampung.svg/200px-Lambang_Universitas_Lampung.svg.png",

  // Universitas Sriwijaya
  "Universitas Sriwijaya": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Logo_Universitas_Sriwijaya.svg/200px-Logo_Universitas_Sriwijaya.svg.png",
  "UNSRI": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Logo_Universitas_Sriwijaya.svg/200px-Logo_Universitas_Sriwijaya.svg.png",

  // Universitas Udayana
  "Universitas Udayana": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Logo_Universitas_Udayana.svg/200px-Logo_Universitas_Udayana.svg.png",
  "UNUD": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Logo_Universitas_Udayana.svg/200px-Logo_Universitas_Udayana.svg.png",

  // Universitas Sam Ratulangi
  "Universitas Sam Ratulangi": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Logo_UNSRAT.png/200px-Logo_UNSRAT.png",
  "UNSRAT": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Logo_UNSRAT.png/200px-Logo_UNSRAT.png",

  // Universitas Mulawarman
  "Universitas Mulawarman": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Logo_Universitas_Mulawarman.png/200px-Logo_Universitas_Mulawarman.png",
  "UNMUL": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Logo_Universitas_Mulawarman.png/200px-Logo_Universitas_Mulawarman.png",

  // Universitas Tanjungpura
  "Universitas Tanjungpura": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Logo_Universitas_Tanjungpura.png/200px-Logo_Universitas_Tanjungpura.png",
  "UNTAN": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Logo_Universitas_Tanjungpura.png/200px-Logo_Universitas_Tanjungpura.png",

  // Universitas Mataram
  "Universitas Mataram": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Logo_Universitas_Mataram.png/200px-Logo_Universitas_Mataram.png",
  "UNRAM": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Logo_Universitas_Mataram.png/200px-Logo_Universitas_Mataram.png",

  // Universitas Pattimura
  "Universitas Pattimura": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Logo_Universitas_Pattimura.png/200px-Logo_Universitas_Pattimura.png",
  "UNPATTI": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Logo_Universitas_Pattimura.png/200px-Logo_Universitas_Pattimura.png",

  // Universitas Negeri Makassar
  "Universitas Negeri Makassar": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Logo_UNM.png/200px-Logo_UNM.png",
  "UNM": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Logo_UNM.png/200px-Logo_UNM.png",

  // Universitas Jember
  "Universitas Jember": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Logo_Universitas_Jember.svg/200px-Logo_Universitas_Jember.svg.png",
  "UNEJ": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Logo_Universitas_Jember.svg/200px-Logo_Universitas_Jember.svg.png",

  // Universitas Syiah Kuala
  "Universitas Syiah Kuala": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Lambang_Universitas_Syiah_Kuala.svg/200px-Lambang_Universitas_Syiah_Kuala.svg.png",
  "USK": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Lambang_Universitas_Syiah_Kuala.svg/200px-Lambang_Universitas_Syiah_Kuala.svg.png",
  "UNSYIAH": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Lambang_Universitas_Syiah_Kuala.svg/200px-Lambang_Universitas_Syiah_Kuala.svg.png",

  // Universitas Riau
  "Universitas Riau": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Logo_Universitas_Riau.png/200px-Logo_Universitas_Riau.png",
  "UNRI": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Logo_Universitas_Riau.png/200px-Logo_Universitas_Riau.png",

  // Universitas Jambi
  "Universitas Jambi": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Logo_Universitas_Jambi.png/200px-Logo_Universitas_Jambi.png",
  "UNJA": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Logo_Universitas_Jambi.png/200px-Logo_Universitas_Jambi.png",

  // Universitas Bengkulu
  "Universitas Bengkulu": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Logo_Universitas_Bengkulu.png/200px-Logo_Universitas_Bengkulu.png",
  "UNIB": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Logo_Universitas_Bengkulu.png/200px-Logo_Universitas_Bengkulu.png",

  // Universitas Negeri Padang
  "Universitas Negeri Padang": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Lambang_Universitas_Negeri_Padang.svg/200px-Lambang_Universitas_Negeri_Padang.svg.png",
  "UNP": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Lambang_Universitas_Negeri_Padang.svg/200px-Lambang_Universitas_Negeri_Padang.svg.png",

  // Universitas Palangka Raya
  "Universitas Palangka Raya": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Logo_UPR.png/200px-Logo_UPR.png",
  "UPR": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Logo_UPR.png/200px-Logo_UPR.png",

  // Universitas Lambung Mangkurat
  "Universitas Lambung Mangkurat": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Logo_Universitas_Lambung_Mangkurat.png/200px-Logo_Universitas_Lambung_Mangkurat.png",
  "ULM": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Logo_Universitas_Lambung_Mangkurat.png/200px-Logo_Universitas_Lambung_Mangkurat.png",

  // Politeknik Negeri Bandung
  "Politeknik Negeri Bandung": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Polban_logo.svg/200px-Polban_logo.svg.png",
  "POLBAN": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Polban_logo.svg/200px-Polban_logo.svg.png",

  // Universitas Negeri Gorontalo
  "Universitas Negeri Gorontalo": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Logo_UNG.png/200px-Logo_UNG.png",
  "UNG": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Logo_UNG.png/200px-Logo_UNG.png",

  // Universitas Haluoleo
  "Universitas Haluoleo": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Logo_Universitas_Halu_Oleo.png/200px-Logo_Universitas_Halu_Oleo.png",
  "UHO": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Logo_Universitas_Halu_Oleo.png/200px-Logo_Universitas_Halu_Oleo.png",

  // Universitas Cenderawasih
  "Universitas Cenderawasih": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Logo_Universitas_Cenderawasih.png/200px-Logo_Universitas_Cenderawasih.png",
  "UNCEN": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Logo_Universitas_Cenderawasih.png/200px-Logo_Universitas_Cenderawasih.png",

  // Universitas Negeri Manado
  "Universitas Negeri Manado": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Logo_UNIMA.png/200px-Logo_UNIMA.png",
  "UNIMA": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Logo_UNIMA.png/200px-Logo_UNIMA.png",

  // Institut Seni Indonesia (berbagai kota)
  "Institut Seni Indonesia Yogyakarta": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Logo_ISI_Yogyakarta.png/200px-Logo_ISI_Yogyakarta.png",
  "ISI Yogyakarta": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Logo_ISI_Yogyakarta.png/200px-Logo_ISI_Yogyakarta.png",
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
