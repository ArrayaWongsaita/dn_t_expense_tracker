export interface ExpenseRecord {
  id: string;
  title: string;
  amount: string;
  spentOn: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseResponse {
  id: string;
  title: string;
  amount: string;
  spentOn: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
