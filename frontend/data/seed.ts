import type { ClassGroup, Lesson, Stage, Student, Subject } from "@/lib/types";

export const DEFAULT_STAGES: Stage[] = [
  { id: "s1", title: "Актуализация знаний", order: 1 },
  { id: "s2", title: "Изучение нового", order: 2 },
  { id: "s3", title: "Первичное закрепление", order: 3 },
  { id: "s4", title: "Самостоятельная работа", order: 4 },
  { id: "s5", title: "Рефлексия", order: 5 },
];

export const SEED_SUBJECTS: Subject[] = [
  { id: "math", name: "Математика" },
  { id: "physics", name: "Физика" },
  { id: "informatics", name: "Информатика" },
];

function makeStudents(prefix: string, names: string[]): Student[] {
  return names.map((name, i) => ({ id: `${prefix}${i + 1}`, name }));
}

export const SEED_CLASSES: ClassGroup[] = [
  {
    id: "class-7a",
    name: "7 «А» класс",
    students: makeStudents("7a-", [
      "Алиева Айгерим",
      "Бекенов Арман",
      "Жумабекова Дана",
      "Касымов Ерлан",
      "Нурланова Жанар",
      "Омаров Ильяс",
      "Сейтова Камила",
      "Тлеуберген Мадина",
      "Усенов Нурбек",
      "Шарипова Сауле",
      "Ыдырысов Тимур",
      "Абдуллаева Фариза",
      "Болатов Руслан",
      "Ермекова Асель",
      "Кенжебаев Дастан",
    ]),
  },
  {
    id: "class-7b",
    name: "7 «Б» класс",
    students: makeStudents("7b-", [
      "Ахметов Санжар",
      "Байжанова Айсулу",
      "Досжанов Мирас",
      "Ерғали Аружан",
      "Жақсылық Нұрсұлтан",
      "Ибраева Динара",
      "Каиров Алишер",
      "Мұратқызы Аяжан",
      "Оспанов Данияр",
      "Рахимова Индира",
      "Сағындық Ерасыл",
      "Тоқтаров Бекзат",
      "Утегенова Меруерт",
      "Хамитов Алихан",
    ]),
  },
  {
    id: "class-8a",
    name: "8 «А» класс",
    students: makeStudents("8a-", [
      "Аманжолов Нурлан",
      "Бердібек Ләззат",
      "Ғаниева Сабина",
      "Дәулетов Ансар",
      "Есжанова Ботагөз",
      "Жанатов Темірлан",
      "Зейнуллина Гүлмира",
      "Исабеков Даурен",
      "Қайратқызы Ару",
      "Лесбеков Ерасыл",
      "Мұқанова Жансая",
      "Нұрғалиев Асқар",
      "Пірімқұлова Айым",
      "Серікбай Мансұр",
      "Тұрсынова Дильназ",
      "Ыбырай Айдос",
    ]),
  },
];

const TOPICS: Record<string, string[]> = {
  math: [
    "Дроби и проценты",
    "Уравнения с дробями",
    "Пропорции",
    "Прямая и обратная пропорциональность",
  ],
  physics: [
    "Механическое движение",
    "Масса и плотность",
    "Сила тяжести",
    "Давление твёрдых тел",
  ],
  informatics: [
    "Системы счисления",
    "Логические операции",
    "Алгоритмы и блок-схемы",
    "Циклы и ветвления",
  ],
};

/** Детерминированный ГПСЧ — чтобы демо-данные не менялись между перезагрузками. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(i)) | 0;
  }
  return hash;
}

function isoDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0];
}

function buildLesson(
  classGroup: ClassGroup,
  subject: Subject,
  index: number,
  isActive: boolean
): Lesson {
  const id = `${classGroup.id}-${subject.id}-${index + 1}`;
  const random = mulberry32(hashString(id));
  const stages = DEFAULT_STAGES;

  const studentResults = classGroup.students.map((student, studentIndex) => {
    // Латентная «сила» ученика плюс лёгкий рост от урока к уроку.
    const ability =
      0.45 + ((studentIndex * 7) % 10) / 18 + index * 0.03 + random() * 0.12;

    const marks = stages.map((_, stageIndex) => {
      const difficulty = stageIndex * 0.09;
      return random() < ability - difficulty ? "+" : "-";
    }) as ("+" | "-")[];

    const plusCount = marks.filter((m) => m === "+").length;

    return {
      studentId: student.id,
      stages: stages.map((stage, i) => ({
        stageId: stage.id,
        mark: marks[i],
      })),
      plusCount,
      minusCount: marks.length - plusCount,
      percentage: Math.round((plusCount / marks.length) * 100),
    };
  });

  const classStageResults = stages.map((stage) => {
    const plusCount = studentResults.filter(
      (result) => result.stages.find((s) => s.stageId === stage.id)?.mark === "+"
    ).length;
    const total = studentResults.length;
    return {
      stageId: stage.id,
      plusCount,
      minusCount: total - plusCount,
      percentage: Math.round((plusCount / total) * 100),
    };
  });

  const classPercentage = Math.round(
    studentResults.reduce((sum, r) => sum + r.percentage, 0) /
      studentResults.length
  );

  const emptyResults = classGroup.students.map((student) => ({
    studentId: student.id,
    stages: stages.map((stage) => ({ stageId: stage.id, mark: null })),
    plusCount: 0,
    minusCount: 0,
    percentage: 0,
  }));

  return {
    id,
    title: TOPICS[subject.id][index] ?? `Урок ${index + 1}`,
    date: isoDate((3 - index) * 7),
    classId: classGroup.id,
    subjectId: subject.id,
    stages,
    isActive,
    classPercentage: isActive ? 0 : classPercentage,
    classStageResults: isActive
      ? stages.map((s) => ({
          stageId: s.id,
          plusCount: 0,
          minusCount: 0,
          percentage: 0,
        }))
      : classStageResults,
    studentResults: isActive ? emptyResults : studentResults,
  };
}

function buildSeedLessons(): Lesson[] {
  const lessons: Lesson[] = [];

  for (const classGroup of SEED_CLASSES) {
    for (const subject of SEED_SUBJECTS) {
      // Активный урок заводим только для основной пары, остальные — завершённые.
      const hasActive =
        classGroup.id === "class-7a" && subject.id === "math";

      for (let index = 0; index < 4; index++) {
        const isLast = index === 3;
        lessons.push(
          buildLesson(classGroup, subject, index, hasActive && isLast)
        );
      }
    }
  }

  return lessons;
}

export const SEED_LESSONS: Lesson[] = buildSeedLessons();

export const DEFAULT_CLASS_ID = SEED_CLASSES[0].id;
export const DEFAULT_SUBJECT_ID = SEED_SUBJECTS[0].id;
