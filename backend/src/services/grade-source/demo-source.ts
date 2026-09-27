import {
  DEMO_STUDENTS,
  DEMO_SUBJECT,
  buildDemoGrades,
} from "../../data/demo-grades";
import type { GradeSource } from "./types";

export const demoSource: GradeSource = {
  name: "demo",
  description:
    "Демонстрационные данные одного класса по математике за 14 недель.",
  async fetchStudents() {
    return DEMO_STUDENTS;
  },
  async fetchSubjects() {
    return [DEMO_SUBJECT];
  },
  async fetchGrades() {
    return buildDemoGrades();
  },
};
