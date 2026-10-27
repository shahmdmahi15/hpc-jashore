import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export const CHAT_PRIORITIES = ['normal', 'urgent', 'stat'] as const;
export type ChatPriority = (typeof CHAT_PRIORITIES)[number];

export const CHAT_MESSAGE_TYPES = [
  'text',
  'patient_mention',
  'clinical_handoff',
  'broadcast',
] as const;
export type ChatMessageType = (typeof CHAT_MESSAGE_TYPES)[number];

export class SendMessageDto {
  @IsNotEmpty({ message: 'Message content cannot be empty' })
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  chatDate?: string; // Format: 'YYYY-MM-DD'

  @IsOptional()
  @IsIn(CHAT_PRIORITIES, { message: 'priority must be normal, urgent, or stat' })
  priority?: ChatPriority;

  @IsOptional()
  @IsIn(CHAT_MESSAGE_TYPES, {
    message: 'messageType must be text, patient_mention, clinical_handoff, or broadcast',
  })
  messageType?: ChatMessageType;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class GetMessagesQueryDto {
  @IsOptional()
  @IsString()
  date?: string; // Format: 'YYYY-MM-DD'
}

export class SearchMentionsQueryDto {
  @IsNotEmpty()
  @IsIn(['patient', 'user'], { message: "type must be either 'patient' or 'user'" })
  type!: 'patient' | 'user';

  @IsOptional()
  @IsString()
  q?: string;
}
