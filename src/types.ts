export interface Student {
  id: string;
  name: string;
  class: string;
  gender: 'Male' | 'Female';
  createdAt: any;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  createdAt: any;
}

export interface Result {
  id: string;
  studentId: string;
  subjectId: string;
  score: number;
  grade: string;
  term: string;
  year: string;
  authorUid: string;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'admin' | 'teacher';
}
