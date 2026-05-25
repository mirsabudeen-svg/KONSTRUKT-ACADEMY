export type TutorMessageRole = "user" | "assistant";

export type TutorMessage = {
  id: string;
  role: TutorMessageRole;
  content: string;
  created_at?: string;
};

export type TutorConversation = {
  id: string;
  student_id: string;
  module_id: number;
  messages: TutorMessage[];
  created_at: string;
  updated_at: string;
};

export type ModuleContext = {
  moduleId: number;
  title: string;
  description: string | null;
  badgeName: string;
  objectives: string[];
  completionPercentage: number;
  progressStatus: string;
  hardwareNotes: string[];
};

export type TutorChatRequest = {
  module_id: number;
  message: string;
  conversation_id?: string;
};

export type TutorChatStreamMeta = {
  conversation_id: string;
};
