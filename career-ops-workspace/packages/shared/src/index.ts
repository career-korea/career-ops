export interface UserProfileDto {
  userId: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface EvaluationRequestDto {
  jdText: string;
  cvText: string;
  companyName: string;
}

export interface EvaluationResultDto {
  score: number;
  gapAnalysis: string;
  interviewPrepSTAR: string;
}
