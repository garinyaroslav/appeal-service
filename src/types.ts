export interface IAppeal {
  id: number;
  text: string;
  topic: string;
  status: AppealStatus;
  created_at: string;
}

export enum AppealStatus {
  new = "NEW",
  inWork = "IN_WORK",
  completed = "COMPLETED",
  cancelled = "CANCELLED",
}
