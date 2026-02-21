import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ProgramStudi {
  id: string;
  programStudi: string;
  universitas: string;
  tingkat: string;
  jurusanSekolah: string;
  dayaTampungSekarang: number;
  dayaTampungSebelumnya: number;
  peminatSebelumnya: number;
  nilai: number;
  passingGrade: number;
}

export interface StudentData {
  nama: string;
  asalSekolah: string;
  akreditasi: string;
  tipeSekolah: string;
  jurusanSekolah: string;
}

export interface GradeEntry {
  id: string;
  mataPelajaran: string;
  semester1: number;
  semester2: number;
  semester3: number;
  semester4: number;
  semester5: number;
}

export interface Achievement {
  id: string;
  namaPrestasi: string;
  tingkat: string;
  juara: string;
}

export interface JurusanSelection {
  universitas: string;
  programStudi: string;
  programStudiData?: ProgramStudi;
}

export interface AnalysisResult {
  pilihan: number;
  universitas: string;
  programStudi: string;
  peluang: string;
  persentase: number;
  jurusanMismatch?: boolean;
  details: {
    nilaiScore: number;
    dayaTampungScore: number;
    peminatScore: number;
    prestasiScore: number;
    akreditasiScore: number;
    jurusanScore?: number;
  };
}

interface ConsultationContextValue {
  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
  masterData: ProgramStudi[];
  setMasterData: (data: ProgramStudi[]) => void;
  studentData: StudentData;
  setStudentData: (data: StudentData) => void;
  grades: GradeEntry[];
  setGrades: (grades: GradeEntry[]) => void;
  achievements: Achievement[];
  setAchievements: (achievements: Achievement[]) => void;
  selections: [JurusanSelection | null, JurusanSelection | null];
  setSelections: (selections: [JurusanSelection | null, JurusanSelection | null]) => void;
  averageGrade: number;
  logout: () => void;
  resetConsultation: () => void;
}

const ConsultationContext = createContext<ConsultationContextValue | null>(null);

const STORAGE_KEYS = {
  MASTER_DATA: '@snbp_master_data',
  STUDENT_DATA: '@snbp_student_data',
  GRADES: '@snbp_grades',
  ACHIEVEMENTS: '@snbp_achievements',
  SELECTIONS: '@snbp_selections',
  LOGGED_IN: '@snbp_logged_in',
};

const defaultStudent: StudentData = {
  nama: '',
  asalSekolah: '',
  akreditasi: '',
  tipeSekolah: '',
  jurusanSekolah: '',
};

export function ConsultationProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [masterData, setMasterDataState] = useState<ProgramStudi[]>([]);
  const [studentData, setStudentDataState] = useState<StudentData>(defaultStudent);
  const [grades, setGradesState] = useState<GradeEntry[]>([]);
  const [achievements, setAchievementsState] = useState<Achievement[]>([]);
  const [selections, setSelectionsState] = useState<[JurusanSelection | null, JurusanSelection | null]>([null, null]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [master, student, gradesData, achievementsData, selectionsData, loggedIn] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.MASTER_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.STUDENT_DATA),
        AsyncStorage.getItem(STORAGE_KEYS.GRADES),
        AsyncStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS),
        AsyncStorage.getItem(STORAGE_KEYS.SELECTIONS),
        AsyncStorage.getItem(STORAGE_KEYS.LOGGED_IN),
      ]);
      if (master) setMasterDataState(JSON.parse(master));
      if (student) setStudentDataState(JSON.parse(student));
      if (gradesData) setGradesState(JSON.parse(gradesData));
      if (achievementsData) setAchievementsState(JSON.parse(achievementsData));
      if (selectionsData) setSelectionsState(JSON.parse(selectionsData));
      if (loggedIn === 'true') setIsLoggedIn(true);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
    setLoaded(true);
  };

  const setMasterData = (data: ProgramStudi[]) => {
    setMasterDataState(data);
    AsyncStorage.setItem(STORAGE_KEYS.MASTER_DATA, JSON.stringify(data));
  };

  const setStudentData = (data: StudentData) => {
    setStudentDataState(data);
    AsyncStorage.setItem(STORAGE_KEYS.STUDENT_DATA, JSON.stringify(data));
  };

  const setGrades = (data: GradeEntry[]) => {
    setGradesState(data);
    AsyncStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify(data));
  };

  const setAchievements = (data: Achievement[]) => {
    setAchievementsState(data);
    AsyncStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(data));
  };

  const setSelections = (data: [JurusanSelection | null, JurusanSelection | null]) => {
    setSelectionsState(data);
    AsyncStorage.setItem(STORAGE_KEYS.SELECTIONS, JSON.stringify(data));
  };

  const handleSetLoggedIn = (v: boolean) => {
    setIsLoggedIn(v);
    AsyncStorage.setItem(STORAGE_KEYS.LOGGED_IN, v ? 'true' : 'false');
  };

  const resetConsultation = () => {
    setStudentData(defaultStudent);
    setGrades([]);
    setAchievements([]);
    setSelections([null, null]);
  };

  const logout = () => {
    handleSetLoggedIn(false);
  };

  const averageGrade = useMemo(() => {
    if (grades.length === 0) return 0;
    let total = 0;
    let count = 0;
    grades.forEach(g => {
      const vals = [g.semester1, g.semester2, g.semester3, g.semester4, g.semester5].filter(v => v > 0);
      total += vals.reduce((a, b) => a + b, 0);
      count += vals.length;
    });
    return count > 0 ? Math.round((total / count) * 100) / 100 : 0;
  }, [grades]);

  const value = useMemo(() => ({
    isLoggedIn,
    setIsLoggedIn: handleSetLoggedIn,
    masterData,
    setMasterData,
    studentData,
    setStudentData,
    grades,
    setGrades,
    achievements,
    setAchievements,
    selections,
    setSelections,
    averageGrade,
    logout,
    resetConsultation,
  }), [isLoggedIn, masterData, studentData, grades, achievements, selections, averageGrade]);

  if (!loaded) return null;

  return (
    <ConsultationContext.Provider value={value}>
      {children}
    </ConsultationContext.Provider>
  );
}

export function useConsultation() {
  const ctx = useContext(ConsultationContext);
  if (!ctx) throw new Error('useConsultation must be used within ConsultationProvider');
  return ctx;
}
