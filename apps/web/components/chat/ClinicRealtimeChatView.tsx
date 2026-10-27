// apps/web/components/chat/ClinicRealtimeChatView.tsx
'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Send,
  Volume2,
  VolumeX,
  Calendar,
  Clock,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  User,
  Users,
  AtSign,
  Hash,
  Stethoscope,
  Activity,
  CreditCard,
  UserCheck,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  ChevronDown,
  X,
  Phone,
  HeartPulse,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  CornerDownLeft,
  Search,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { PatientTimelineModal } from '@/components/patient/PatientTimelineModal';
import { api, getSession, UserSession } from '@/lib/api';
import { useRealtime, RealtimeEvent } from '@/lib/use-realtime';
import {
  playIncomingChime,
  playUrgentChime,
  playSentPop,
  isChatSoundEnabled,
  setChatSoundEnabled,
} from '@/lib/sound-effects';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// =============================================================================
// Interfaces & Types
// =============================================================================

export type MessagePriority = 'normal' | 'urgent' | 'stat';
export type MessageType = 'text' | 'patient_mention' | 'clinical_handoff' | 'broadcast';

export interface ChatMessage {
  id: string;
  chatDate: string;
  content: string;
  priority: MessagePriority;
  messageType: MessageType;
  senderId?: string;
  senderName?: string;
  senderRole?: 'admin' | 'doctor' | 'handler' | 'cashier' | 'receptionist';
  patientId?: string;
  patientMrn?: string;
  patientName?: string;
  patientAge?: number | string;
  patientGender?: string;
  mentions?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface PatientSuggestion {
  id: string;
  mrn: string;
  name: string;
  phone?: string;
  gender?: string;
  age?: number | string;
}

export interface UserSuggestion {
  id: string;
  displayName: string;
  role: 'admin' | 'doctor' | 'handler' | 'cashier' | 'receptionist';
  email?: string;
}

const ROLE_GROUPS = [
  {
    id: '@all',
    labelEn: '@all (All Staff)',
    labelBn: '@all (সকলকে)',
    descEn: 'Clinic-wide broadcast notice to everyone',
    descBn: 'পুরো ক্লিনিকের সকলের জন্য সার্বিক নোটিশ',
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    id: '@doctors',
    labelEn: '@doctors (All Doctors)',
    labelBn: '@doctors (ডাক্তারগণ)',
    descEn: 'All clinical medical consultants',
    descBn: 'সকল কনসালটেন্ট ও মেডিকেল অফিসার',
    color: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
  },
  {
    id: '@handlers',
    labelEn: '@handlers (Therapists)',
    labelBn: '@handlers (থেরাপিস্টগণ)',
    descEn: 'Physiotherapists & rehabilitation team',
    descBn: 'সকল ফিজিওথেরাপিস্ট ও সহকারী টিম',
    color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
  },
  {
    id: '@cashiers',
    labelEn: '@cashiers (Accounts & Billing)',
    labelBn: '@cashiers (ক্যাশিয়ার)',
    descEn: 'Cashier & billing payment desk',
    descBn: 'বিলিং কাউন্টার ও ক্যাশ কালেকশন ডেস্ক',
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  {
    id: '@reception',
    labelEn: '@reception (Front Desk)',
    labelBn: '@reception (রিসেপশন)',
    descEn: 'Front desk intake, registration & serials',
    descBn: 'রোগী নিবন্ধন, সিরিয়াল ও অভ্যর্থনা ডেস্ক',
    color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
];

// Helpers
function getTodayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toBnNum(val: number | string | undefined | null): string {
  if (val == null || val === '') return '';
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(val).replace(/[0-9]/g, (d) => bn[parseInt(d, 10)]);
}

function formatChatDateDisplay(dateStr: string, isBn: boolean): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(year, month, day);

      const monthsBn = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      const monthsEn = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];

      if (isBn) {
        return `${toBnNum(day)} ${monthsBn[month]} ${toBnNum(year)}`;
      }
      return `${day} ${monthsEn[month]} ${year}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
}

function formatMessageTime(isoString: string, isBn: boolean): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? (isBn ? 'অপরাহ্ন' : 'PM') : (isBn ? 'পূর্বাহ্ন' : 'AM');
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minStr = minutes < 10 ? `0${minutes}` : String(minutes);

    if (isBn) {
      return `${toBnNum(hours)}:${toBnNum(minStr)} ${ampm}`;
    }
    return `${hours}:${minStr} ${ampm}`;
  } catch {
    return isoString;
  }
}

// Role Avatar / Badge Helpers
export function getRoleBadgeConfig(role?: string) {
  switch (role) {
    case 'doctor':
      return {
        icon: Stethoscope,
        labelEn: 'Doctor',
        labelBn: 'ডাক্তার',
        classes: 'border-teal-500/40 bg-teal-500/10 text-teal-600 dark:text-teal-400',
        avatarBg: 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30',
      };
    case 'handler':
      return {
        icon: Activity,
        labelEn: 'Therapist',
        labelBn: 'থেরাপিস্ট',
        classes: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        avatarBg: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      };
    case 'cashier':
      return {
        icon: CreditCard,
        labelEn: 'Cashier',
        labelBn: 'ক্যাশিয়ার',
        classes: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        avatarBg: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
      };
    case 'receptionist':
      return {
        icon: UserCheck,
        labelEn: 'Receptionist',
        labelBn: 'রিসেপশন',
        classes: 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400',
        avatarBg: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
      };
    case 'admin':
    default:
      return {
        icon: ShieldCheck,
        labelEn: 'Admin',
        labelBn: 'অ্যাডমিন',
        classes: 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400',
        avatarBg: 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30',
      };
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function ClinicRealtimeChatView() {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const isViewingToday = selectedDate === todayIso;

  // Session & Audio State
  const [session, setSession] = useState<UserSession | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Chat Data & Feed
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Input Box State
  const [inputContent, setInputContent] = useState<string>('');
  const [priority, setPriority] = useState<MessagePriority>('normal');
  const [messageType, setMessageType] = useState<MessageType>('text');
  const [selectedPatient, setSelectedPatient] = useState<PatientSuggestion | null>(null);

  // Auto-complete Mentions State
  const [mentionType, setMentionType] = useState<'user' | 'patient' | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [patientSuggestions, setPatientSuggestions] = useState<PatientSuggestion[]>([]);
  const [isSearchingMentions, setIsSearchingMentions] = useState<boolean>(false);

  // Modal Dialogs
  const [showDateDialog, setShowDateDialog] = useState<boolean>(false);
  const [customDateInput, setCustomDateInput] = useState<string>(selectedDate);
  const [selectedTimelinePatient, setSelectedTimelinePatient] = useState<{
    open: boolean;
    patientId?: string;
    patientName?: string;
    mrn?: string;
    phone?: string;
  }>({ open: false });

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize Session and Sound State
  useEffect(() => {
    setSession(getSession());
    setSoundEnabled(isChatSoundEnabled());
  }, []);

  // Fetch Message Dates
  const loadMessageDates = useCallback(async () => {
    try {
      const dates = await api.chat.getDates();
      if (Array.isArray(dates)) {
        setAvailableDates(dates);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadMessageDates();
  }, [loadMessageDates]);

  // Fetch Messages for Selected Date
  const loadMessagesForDate = useCallback(async (date: string) => {
    setIsLoading(true);
    try {
      const data = await api.chat.getMessages(date);
      if (Array.isArray(data)) {
        // Map backend entities to ChatMessage safely
        const mapped: ChatMessage[] = data.map((item: any) => ({
          id: item.id || `msg-${Math.random()}`,
          chatDate: item.chatDate || item.date || date,
          content: item.content || '',
          priority: (item.priority as MessagePriority) || 'normal',
          messageType: (item.messageType as MessageType) || 'text',
          senderId: item.senderId || item.userId || item.sender?.id,
          senderName: item.senderName || item.sender?.displayName || item.authorName || (isBn ? 'ক্লিনিক্যাল স্টাফ' : 'Clinical Staff'),
          senderRole: item.senderRole || item.sender?.role || 'admin',
          patientId: item.patientId || item.metadata?.patientId,
          patientMrn: item.patientMrn || item.metadata?.patientMrn,
          patientName: item.patientName || item.metadata?.patientName,
          patientAge: item.patientAge || item.metadata?.patientAge,
          patientGender: item.patientGender || item.metadata?.patientGender,
          mentions: item.mentions || [],
          metadata: item.metadata || {},
          createdAt: item.createdAt || new Date().toISOString(),
        }));
        setMessages(mapped);
      } else {
        setMessages([]);
      }
    } catch (err: any) {
      toast.error(isBn ? 'বার্তা লোড করতে ব্যর্থ হয়েছে' : 'Failed to load chat messages');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  }, [isBn]);

  useEffect(() => {
    loadMessagesForDate(selectedDate);
  }, [selectedDate, loadMessagesForDate]);

  // Auto-scroll when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Handle Real-Time SSE Event
  const handleRealtimeMessage = useCallback(
    (payload: any) => {
      if (!payload) return;

      const msgDate = payload.chatDate || payload.date || (payload.createdAt ? payload.createdAt.split('T')[0] : '');
      const incomingId = payload.id;

      // Only append if message belongs to currently viewed date
      if (msgDate === selectedDate || (!msgDate && isViewingToday)) {
        setMessages((prev) => {
          if (incomingId && prev.some((m) => m.id === incomingId)) {
            return prev;
          }
          const newMsg: ChatMessage = {
            id: incomingId || `rt-${Date.now()}`,
            chatDate: msgDate || selectedDate,
            content: payload.content || '',
            priority: (payload.priority as MessagePriority) || 'normal',
            messageType: (payload.messageType as MessageType) || 'text',
            senderId: payload.senderId || payload.userId || payload.sender?.id,
            senderName: payload.senderName || payload.sender?.displayName || payload.authorName || (isBn ? 'ক্লিনিক্যাল স্টাফ' : 'Clinical Staff'),
            senderRole: payload.senderRole || payload.sender?.role || 'admin',
            patientId: payload.patientId || payload.metadata?.patientId,
            patientMrn: payload.patientMrn || payload.metadata?.patientMrn,
            patientName: payload.patientName || payload.metadata?.patientName,
            patientAge: payload.patientAge || payload.metadata?.patientAge,
            patientGender: payload.patientGender || payload.metadata?.patientGender,
            mentions: payload.mentions || [],
            metadata: payload.metadata || {},
            createdAt: payload.createdAt || new Date().toISOString(),
          };
          return [...prev, newMsg];
        });

        // Play chime if message was sent by another user
        const currentUserId = session?.userId;
        const isFromOther = !currentUserId || payload.senderId !== currentUserId;
        if (isFromOther) {
          if (payload.priority === 'urgent' || payload.priority === 'stat') {
            playUrgentChime();
          } else {
            playIncomingChime();
          }
        }
      }
    },
    [selectedDate, isViewingToday, session?.userId, isBn]
  );

  // Realtime hook
  const { isConnected } = useRealtime((evt: RealtimeEvent) => {
    if (evt.type === 'chat.message' && evt.payload) {
      handleRealtimeMessage(evt.payload);
    }
  });

  // Sound Toggle Handler
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setChatSoundEnabled(next);
    if (next) {
      playIncomingChime();
      toast.success(isBn ? 'বার্তা সাউন্ড চালু হয়েছে' : 'Chat chime notifications enabled');
    } else {
      toast.info(isBn ? 'বার্তা সাউন্ড মিউট করা হয়েছে' : 'Chat chime notifications muted');
    }
  };

  // Autocomplete Mentions Handler
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputContent(text);

    const cursorPos = e.target.selectionStart || text.length;
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastWordMatch = textBeforeCursor.match(/([@#][\w\d_-]*)$/);

    if (lastWordMatch) {
      const trigger = lastWordMatch[0][0]; // '@' or '#'
      const query = lastWordMatch[0].slice(1).toLowerCase(); // text after trigger

      if (trigger === '@') {
        setMentionType('user');
        setMentionQuery(query);
        searchUsers(query);
      } else if (trigger === '#') {
        setMentionType('patient');
        setMentionQuery(query);
        searchPatients(query);
      }
    } else {
      setMentionType(null);
      setMentionQuery('');
    }
  };

  // Search Users / Mentions
  const searchUsers = useCallback(async (q: string) => {
    setIsSearchingMentions(true);
    try {
      const data = await api.chat.searchMentions('user', q);
      if (Array.isArray(data)) {
        setUserSuggestions(
          data.map((u: any) => ({
            id: u.id,
            displayName: u.displayName || u.name || u.email,
            role: u.role || 'doctor',
            email: u.email,
          }))
        );
      } else {
        const users = await api.users.list();
        if (Array.isArray(users)) {
          const filtered = users
            .filter((u: any) => !q || u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
            .slice(0, 8)
            .map((u: any) => ({
              id: u.id,
              displayName: u.displayName || u.email,
              role: u.role,
              email: u.email,
            }));
          setUserSuggestions(filtered);
        }
      }
    } catch {
      // fallback
    } finally {
      setIsSearchingMentions(false);
    }
  }, []);

  // Search Patients / Mentions
  const searchPatients = useCallback(async (q: string) => {
    setIsSearchingMentions(true);
    try {
      const data = await api.chat.searchMentions('patient', q);
      if (Array.isArray(data) && data.length > 0) {
        setPatientSuggestions(
          data.map((p: any) => {
            const resolvedName = p.name || (p.nameBn && p.nameEn ? `${p.nameBn} (${p.nameEn})` : (p.nameBn || p.nameEn || p.fullName || 'Patient'));
            return {
              id: p.id,
              mrn: p.mrn,
              name: resolvedName,
              phone: p.phone,
              gender: p.gender,
              age: p.age || p.ageYears,
            };
          })
        );
      } else {
        const res = await api.patients.list(q);
        if (Array.isArray(res)) {
          setPatientSuggestions(
            res.slice(0, 12).map((p: any) => {
              const resolvedName = p.name || (p.nameBn && p.nameEn ? `${p.nameBn} (${p.nameEn})` : (p.nameBn || p.nameEn || p.fullName || 'Patient'));
              return {
                id: p.id,
                mrn: p.mrn,
                name: resolvedName,
                phone: p.phone,
                gender: p.gender,
                age: p.age || p.ageYears,
              };
            })
          );
        }
      }
    } catch {
      // fallback
    } finally {
      setIsSearchingMentions(false);
    }
  }, []);

  // Insert Mention into input
  const insertUserMention = (tag: string) => {
    const cursorPos = textareaRef.current?.selectionStart || inputContent.length;
    const textBefore = inputContent.slice(0, cursorPos);
    const textAfter = inputContent.slice(cursorPos);
    const replaced = textBefore.replace(/@[^@\s]*$/, `${tag} `);
    setInputContent(replaced + textAfter);
    setMentionType(null);
    textareaRef.current?.focus();
  };

  const insertPatientMention = (patient: PatientSuggestion) => {
    const cursorPos = textareaRef.current?.selectionStart || inputContent.length;
    const textBefore = inputContent.slice(0, cursorPos);
    const textAfter = inputContent.slice(cursorPos);
    const tag = `#${patient.mrn || patient.id.slice(0, 8)} [${patient.name}]`;
    const replaced = textBefore.replace(/#[^#\s]*$/, `${tag} `);
    setInputContent(replaced + textAfter);
    setSelectedPatient(patient);
    setMessageType('patient_mention');
    setMentionType(null);
    textareaRef.current?.focus();
  };

  // Send Message Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputContent.trim();
    if (!content || isSending) return;

    setIsSending(true);
    try {
      // Extract mentions
      const mentionsList: string[] = [];
      const mentionMatches = content.match(/@(\w+)/g);
      if (mentionMatches) {
        mentionsList.push(...mentionMatches);
      }

      const postData: any = {
        content,
        chatDate: selectedDate,
        priority,
        messageType: selectedPatient ? 'patient_mention' : messageType,
        patientId: selectedPatient?.id,
        mentions: mentionsList,
        metadata: {
          patientMrn: selectedPatient?.mrn,
          patientName: selectedPatient?.name,
          patientAge: selectedPatient?.age,
          patientGender: selectedPatient?.gender,
          senderDisplayName: session?.displayName,
          senderRole: session?.role,
        },
      };

      // Play audio feedback
      playSentPop();

      // Dispatch through Server Action / API
      const result = await api.chat.sendMessage(postData);

      // Optimistically append message if realtime has not yet fired
      if (result) {
        const optimisticMsg: ChatMessage = {
          id: result.id || `msg-${Date.now()}`,
          chatDate: selectedDate,
          content,
          priority,
          messageType: selectedPatient ? 'patient_mention' : messageType,
          senderId: session?.userId,
          senderName: session?.displayName || (isBn ? 'আমি' : 'Me'),
          senderRole: session?.role || 'admin',
          patientId: selectedPatient?.id,
          patientMrn: selectedPatient?.mrn,
          patientName: selectedPatient?.name,
          patientAge: selectedPatient?.age,
          patientGender: selectedPatient?.gender,
          mentions: mentionsList,
          metadata: postData.metadata,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => {
          if (prev.some((m) => m.id === optimisticMsg.id)) return prev;
          return [...prev, optimisticMsg];
        });
      }

      // Reset Input
      setInputContent('');
      setSelectedPatient(null);
      setPriority('normal');
      setMessageType('text');
      setMentionType(null);
    } catch (err: any) {
      toast.error(isBn ? 'বার্তা পাঠানো যায়নি, পুনরায় চেষ্টা করুন' : 'Failed to send message, please retry');
    } finally {
      setIsSending(false);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  // Keyboard shortcut: Enter to send (Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && mentionType === null) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Switch Date
  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setShowDateDialog(false);
  };

  return (
    <div className="w-full h-full flex flex-col rounded-2xl border border-border/80 bg-background/95 backdrop-blur-md shadow-lg overflow-hidden relative selection:bg-emerald-500/20">
      {/* ----------------------------------------------------------------------- */}
      {/* 1. Header Toolbar */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-border/80 bg-card/60 backdrop-blur-md gap-2 shrink-0">
        {/* Left: Title & Status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <MessageSquare className="size-4 sm:size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground truncate">
                {isBn ? 'ক্লিনিক্যাল টিম চ্যাট ও কোঅর্ডিনেশন' : 'Clinical Team Chat & Coordination'}
              </h2>
              {/* Realtime Live Pulse */}
              <div
                className={cn(
                  'flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border',
                  isConnected
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                )}
                title={isConnected ? 'SSE Live Connected' : 'Reconnecting...'}
              >
                <span
                  className={cn(
                    'size-1.5 rounded-full',
                    isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  )}
                />
                <span className="hidden sm:inline">
                  {isConnected ? (isBn ? 'লাইভ' : 'LIVE') : (isBn ? 'পুনঃসংযোগ...' : 'CONNECTING')}
                </span>
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden sm:block">
              {isBn
                ? 'ডাক্তার, ফিজিওথেরাপিস্ট, রিসেপশন ও ক্যাশিয়ারের সার্বক্ষণিক অভ্যন্তরীণ যোগাযোগ'
                : 'Instant real-time clinical handoff & departmental coordination'}
            </p>
          </div>
        </div>

        {/* Right: Date Selector & Audio Mute Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Sound Toggle Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleSound}
            className={cn(
              'h-8 sm:h-9 px-2 sm:px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer',
              soundEnabled
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                : 'border-border bg-muted/60 text-muted-foreground hover:bg-muted'
            )}
            title={soundEnabled ? 'Mute notification chimes' : 'Unmute notification chimes'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="size-3.5 sm:size-4 text-emerald-500" />
                <span className="hidden md:inline">{isBn ? 'সাউন্ড অন' : 'Sound ON'}</span>
              </>
            ) : (
              <>
                <VolumeX className="size-3.5 sm:size-4 text-muted-foreground" />
                <span className="hidden md:inline">{isBn ? 'মিউট' : 'Muted'}</span>
              </>
            )}
          </Button>

          {/* Date Selector Trigger */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDateDialog(true)}
            className={cn(
              'h-8 sm:h-9 px-2.5 sm:px-3 rounded-xl border flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all',
              isViewingToday
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400'
            )}
          >
            <Calendar className="size-3.5 sm:size-4 shrink-0" />
            <span className="font-medium">
              {isViewingToday
                ? `${isBn ? 'আজকে' : 'Today'} · ${formatChatDateDisplay(selectedDate, isBn)}`
                : formatChatDateDisplay(selectedDate, isBn)}
            </span>
            <ChevronDown className="size-3 text-muted-foreground opacity-70" />
          </Button>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 2. Historical Notice Banner (When viewing past date) */}
      {/* ----------------------------------------------------------------------- */}
      {!isViewingToday && (
        <div className="px-3 sm:px-6 py-2 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-300 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 min-w-0">
            <History className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-semibold truncate">
              {isBn
                ? `📅 আপনি পূর্ববর্তী তারিখের সংরক্ষিত বার্তা দেখছেন (${formatChatDateDisplay(selectedDate, isBn)})`
                : `📅 Viewing archived message history for ${formatChatDateDisplay(selectedDate, isBn)}`}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSelectedDate(todayIso)}
            className="h-7 px-2.5 rounded-lg border-amber-500/40 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 font-bold text-[11px] shrink-0"
          >
            {isBn ? 'আজকের চ্যাটে ফিরে যান' : 'Return to Today'}
            <ArrowRight className="size-3 ml-1" />
          </Button>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 3. Messages Feed */}
      {/* ----------------------------------------------------------------------- */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 min-h-[380px] max-h-[calc(100vh-270px)] bg-dot-grid">
        {isLoading ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <RefreshCw className="size-6 animate-spin text-emerald-500" />
            <p className="text-xs font-medium">{isBn ? 'চ্যাট বার্তা লোড হচ্ছে...' : 'Loading clinical messages...'}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border/60 rounded-2xl bg-muted/20">
            <div className="p-3 rounded-full bg-muted/60 text-muted-foreground mb-3">
              <MessageSquare className="size-7" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              {isViewingToday
                ? isBn
                  ? 'আজকের জন্য কোন বার্তা নেই'
                  : 'No messages yet today'
                : isBn
                ? `${formatChatDateDisplay(selectedDate, isBn)} তারিখে কোন বার্তা পাওয়া যায়নি`
                : `No messages recorded on ${formatChatDateDisplay(selectedDate, isBn)}`}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              {isBn
                ? 'চিকিৎসক, ফিজিওথেরাপিস্ট ও ফ্রন্ট ডেস্ক কর্মীদের সাথে যোগাযোগ করতে নিচে বার্তা লিখুন।'
                : 'Send notices, patient handoffs, or clinical updates to doctors, therapists, and reception staff.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = session?.userId && msg.senderId === session.userId;
            const roleConfig = getRoleBadgeConfig(msg.senderRole);
            const RoleIcon = roleConfig.icon;

            const isUrgent = msg.priority === 'urgent';
            const isStat = msg.priority === 'stat';
            const isHandoff = msg.messageType === 'clinical_handoff';

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-2.5 sm:gap-3 max-w-4xl transition-all',
                  isMe ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row'
                )}
              >
                {/* Sender Avatar */}
                <div
                  className={cn(
                    'size-8 sm:size-9 rounded-xl border flex items-center justify-center shrink-0 shadow-xs font-bold text-xs',
                    roleConfig.avatarBg
                  )}
                  title={`${msg.senderName} (${roleConfig.labelEn})`}
                >
                  <RoleIcon className="size-4 sm:size-4.5" />
                </div>

                {/* Message Bubble Card */}
                <div
                  className={cn(
                    'flex flex-col rounded-2xl p-3 sm:p-4 max-w-[85%] sm:max-w-[78%] shadow-xs border transition-all text-xs sm:text-sm',
                    isMe
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 text-foreground'
                      : 'bg-card border-border/80 text-foreground',
                    isUrgent && 'border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/30',
                    isStat && 'border-red-500/70 bg-red-500/15 ring-2 ring-red-500/40 animate-pulse',
                    isHandoff && 'border-indigo-500/60 bg-indigo-500/10'
                  )}
                >
                  {/* Message Header: Sender name, role badge, priority alert & time */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 mb-1.5 border-b border-border/40">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-foreground">
                        {isMe ? `${msg.senderName} (${isBn ? 'আপনি' : 'You'})` : msg.senderName}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border',
                          roleConfig.classes
                        )}
                      >
                        <RoleIcon className="size-2.5" />
                        <span>{isBn ? roleConfig.labelBn : roleConfig.labelEn}</span>
                      </span>

                      {/* Priority Badges */}
                      {isStat && (
                        <Badge className="bg-red-600 text-white font-extrabold text-[10px] py-0 px-1.5 rounded-md flex items-center gap-1 animate-bounce">
                          <ShieldAlert className="size-3" />
                          <span>⚡ STAT / EMERGENCY</span>
                        </Badge>
                      )}
                      {isUrgent && !isStat && (
                        <Badge className="bg-amber-600 text-white font-bold text-[10px] py-0 px-1.5 rounded-md flex items-center gap-1">
                          <AlertTriangle className="size-3" />
                          <span>{isBn ? '📢 জরুরি' : 'URGENT'}</span>
                        </Badge>
                      )}
                      {isHandoff && (
                        <Badge className="bg-indigo-600 text-white font-semibold text-[10px] py-0 px-1.5 rounded-md flex items-center gap-1">
                          <Sparkles className="size-3" />
                          <span>{isBn ? '📋 রোগী হস্তান্তর' : 'HANDOFF'}</span>
                        </Badge>
                      )}
                    </div>

                    <span className="text-[10px] sm:text-[11px] text-muted-foreground whitespace-nowrap ml-auto">
                      {formatMessageTime(msg.createdAt, isBn)}
                    </span>
                  </div>

                  {/* Message Text Content */}
                  <div className="leading-relaxed whitespace-pre-wrap break-words text-foreground font-sans">
                    {renderFormattedContent(msg.content)}
                  </div>

                  {/* Clinical Patient Card Snippet (If message links a patient) */}
                  {(msg.patientId || msg.patientMrn || msg.metadata?.patientMrn) && (
                    <div className="mt-2.5 p-2.5 rounded-xl border border-teal-500/30 bg-teal-500/10 dark:bg-teal-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-600 dark:text-teal-400 shrink-0">
                          <HeartPulse className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-foreground truncate">
                              {msg.patientName || msg.metadata?.patientName || (isBn ? 'রোগীর বিবরণ' : 'Patient')}
                            </span>
                            <Badge variant="outline" className="text-[10px] py-0 font-mono border-teal-500/40 text-teal-700 dark:text-teal-300">
                              {msg.patientMrn || msg.metadata?.patientMrn || 'MRN'}
                            </Badge>
                          </div>
                          {(msg.patientAge || msg.patientGender || msg.metadata?.patientAge || msg.metadata?.patientGender) && (
                            <p className="text-[11px] text-muted-foreground">
                              {msg.patientAge || msg.metadata?.patientAge ? `${isBn ? toBnNum(msg.patientAge || msg.metadata?.patientAge) + ' বছর' : (msg.patientAge || msg.metadata?.patientAge) + ' Y'} · ` : ''}
                              {msg.patientGender || msg.metadata?.patientGender}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Interactive Button to View Patient Timeline */}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTimelinePatient({
                            open: true,
                            patientId: msg.patientId || msg.metadata?.patientId,
                            patientName: msg.patientName || msg.metadata?.patientName,
                            mrn: msg.patientMrn || msg.metadata?.patientMrn,
                            phone: msg.metadata?.patientPhone,
                          });
                        }}
                        className="h-7 px-2.5 rounded-lg border-teal-500/40 bg-teal-500/20 hover:bg-teal-500/30 text-teal-900 dark:text-teal-200 text-[11px] font-semibold shrink-0 cursor-pointer shadow-2xs"
                      >
                        <Clock className="size-3 mr-1" />
                        <span>{isBn ? 'টাইমলাইন দেখুন' : 'View Timeline'}</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 4. Autocomplete Suggestions Popup (For @ Staff or # Patient) */}
      {/* ----------------------------------------------------------------------- */}
      {mentionType && (
        <div className="mx-3 sm:mx-6 mb-2 rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl p-2 z-30 max-h-56 overflow-y-auto animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between px-2 pb-1.5 mb-1.5 border-b border-border/40 text-[11px] font-bold text-muted-foreground">
            <span>
              {mentionType === 'user'
                ? isBn
                  ? 'কাকে মেনশন করবেন? (@ রোল বা স্টাফ নির্বাচন করুন)'
                  : 'Select Role Group or Staff Member (@)'
                : isBn
                ? 'সংযুক্ত রোগী নির্বাচন করুন (#)'
                : 'Select Clinical Patient (#)'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setMentionType(null)}
              className="h-5 w-5 rounded-md p-0"
            >
              <X className="size-3" />
            </Button>
          </div>

          {/* User & Role Suggestions */}
          {mentionType === 'user' && (
            <div className="space-y-1">
              {/* Role Groups (always shown on top) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pb-1">
                {ROLE_GROUPS.filter(
                  (rg) =>
                    !mentionQuery ||
                    rg.id.toLowerCase().includes(mentionQuery) ||
                    rg.labelEn.toLowerCase().includes(mentionQuery) ||
                    rg.labelBn.includes(mentionQuery)
                ).map((rg) => (
                  <button
                    key={rg.id}
                    type="button"
                    onClick={() => insertUserMention(rg.id)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted/80 text-left cursor-pointer transition-colors w-full border border-border/40"
                  >
                    <span className={cn('px-1.5 py-0.5 rounded-md text-[11px] font-bold border', rg.color)}>
                      {rg.id}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {isBn ? rg.labelBn : rg.labelEn}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {isBn ? rg.descBn : rg.descEn}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Individual Users */}
              {userSuggestions.length > 0 && (
                <div className="border-t border-border/40 pt-1 space-y-0.5">
                  <span className="text-[10px] font-semibold text-muted-foreground px-2">
                    {isBn ? 'সক্রিয় স্টাফ সদস্যবৃন্দ' : 'Active Staff Members'}
                  </span>
                  {userSuggestions.map((u) => {
                    const uRole = getRoleBadgeConfig(u.role);
                    const UIcon = uRole.icon;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => insertUserMention(`@${u.displayName}`)}
                        className="flex items-center justify-between p-1.5 rounded-xl hover:bg-muted text-left cursor-pointer transition-colors w-full"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn('size-6 rounded-lg border flex items-center justify-center shrink-0', uRole.avatarBg)}>
                            <UIcon className="size-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-foreground truncate">{u.displayName}</span>
                        </div>
                        <span className={cn('px-1.5 py-0.5 rounded-md text-[10px] font-medium border shrink-0', uRole.classes)}>
                          {isBn ? uRole.labelBn : uRole.labelEn}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Patient Autocomplete Suggestions */}
          {mentionType === 'patient' && (
            <div className="space-y-1">
              {patientSuggestions.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  {isSearchingMentions
                    ? isBn
                      ? 'রোগী অনুসন্ধান করা হচ্ছে...'
                      : 'Searching patients...'
                    : isBn
                    ? 'কোন রোগী পাওয়া যায়নি'
                    : 'No patients found matching query'}
                </div>
              ) : (
                patientSuggestions.map((pat) => (
                  <button
                    key={pat.id}
                    type="button"
                    onClick={() => insertPatientMention(pat)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-muted text-left cursor-pointer transition-colors w-full border border-border/30 gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 shrink-0">
                        <User className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-foreground truncate">
                            {pat.name}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 font-mono text-teal-600 dark:text-teal-400 border-teal-500/30">
                            {pat.mrn}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {pat.phone ? `${pat.phone} · ` : ''}
                          {pat.gender ? (pat.gender === 'male' ? (isBn ? 'পুরুষ' : 'Male') : pat.gender === 'female' ? (isBn ? 'মহিলা' : 'Female') : pat.gender) : ''}
                          {pat.age ? ` · ${pat.age} ${isBn ? 'বছর' : 'Y'}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 shrink-0 px-2 py-1 rounded-md bg-teal-500/10 border border-teal-500/20">
                      {isBn ? 'সংযুক্ত করুন' : 'Attach'}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 5. Attached Patient Chip (Above Input) */}
      {/* ----------------------------------------------------------------------- */}
      {selectedPatient && (
        <div className="mx-3 sm:mx-6 mb-1.5 px-3 py-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 dark:bg-teal-500/15 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <HeartPulse className="size-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="font-bold text-teal-900 dark:text-teal-200 truncate">
              {selectedPatient.name} ({selectedPatient.mrn})
            </span>
            <Badge className="bg-teal-600 text-white text-[10px] py-0 px-1.5 rounded-md hidden sm:inline-block">
              {isBn ? 'সংযুক্ত ক্লিনিক্যাল রোগী' : 'Attached Clinical Patient'}
            </Badge>
          </div>
          <button
            type="button"
            onClick={() => setSelectedPatient(null)}
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer"
            title="Remove attached patient"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 6. Message Input Toolbar & Textarea */}
      {/* ----------------------------------------------------------------------- */}
      <form
        onSubmit={handleSendMessage}
        className="p-2.5 sm:p-4 border-t border-border/80 bg-card/70 backdrop-blur-md shrink-0 flex flex-col gap-2"
      >
        <div className="flex items-end gap-2">
          {/* Main Input Textarea */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputContent}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={
                isBn
                  ? 'বার্তা লিখুন... (@ মেনশন, # রোগীর MRN বা নাম লিখুন, Enter চাপুন)'
                  : 'Type a message... (@ for staff/roles, # for patient MRN, Enter to send)'
              }
              className="w-full resize-none rounded-xl border border-input bg-background/80 px-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all font-sans leading-relaxed"
            />
          </div>

          {/* Send Button */}
          <Button
            type="submit"
            disabled={!inputContent.trim() || isSending}
            className="h-14 sm:h-14 px-4 sm:px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 shrink-0 cursor-pointer shadow-md active:scale-95 transition-all"
          >
            <Send className="size-4" />
            <span className="text-[10px] sm:text-xs">{isBn ? 'পাঠান' : 'Send'}</span>
          </Button>
        </div>

        {/* Action Controls: Priority Selector, @ and # triggers */}
        <div className="flex items-center justify-between gap-2 flex-wrap text-xs pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Priority Selector Pills */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-muted-foreground font-semibold hidden sm:inline">
                {isBn ? 'অগ্রাধিকার:' : 'Priority:'}
              </span>
              <div className="flex items-center p-0.5 rounded-lg bg-muted/70 border border-border/60">
                <button
                  type="button"
                  onClick={() => {
                    setPriority('normal');
                    setMessageType('text');
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1',
                    priority === 'normal' && messageType !== 'clinical_handoff'
                      ? 'bg-background text-foreground shadow-xs font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="size-1.5 rounded-full bg-zinc-400" />
                  <span>{isBn ? 'সাধারণ' : 'Normal'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPriority('urgent');
                    setMessageType('text');
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1',
                    priority === 'urgent' && messageType !== 'clinical_handoff'
                      ? 'bg-amber-500 text-white shadow-xs font-black'
                      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                  )}
                >
                  <AlertTriangle className="size-3" />
                  <span>{isBn ? '📢 জরুরি' : 'Urgent'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPriority('stat');
                    setMessageType('text');
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-black transition-all cursor-pointer flex items-center gap-1',
                    priority === 'stat'
                      ? 'bg-red-600 text-white shadow-xs font-black animate-pulse'
                      : 'text-red-600 dark:text-red-400 hover:bg-red-500/10'
                  )}
                >
                  <ShieldAlert className="size-3" />
                  <span>{isBn ? '⚡ STAT' : '⚡ STAT'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (messageType === 'clinical_handoff') {
                      setMessageType('text');
                      setPriority('normal');
                    } else {
                      setMessageType('clinical_handoff');
                      setPriority('urgent');
                    }
                  }}
                  className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 hidden md:flex',
                    messageType === 'clinical_handoff'
                      ? 'bg-indigo-600 text-white shadow-xs font-bold'
                      : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10'
                  )}
                  title={isBn ? 'ক্লিনিক্যাল হ্যান্ডঅফ হস্তান্তর' : 'Clinical Handoff'}
                >
                  <Activity className="size-3" />
                  <span>{isBn ? 'হ্যান্ডঅফ' : 'Handoff'}</span>
                </button>
              </div>
            </div>

            {/* Quick @ Mention trigger button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setMentionType('user');
                setMentionQuery('');
                searchUsers('');
              }}
              className="h-7 px-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 cursor-pointer"
            >
              <AtSign className="size-3.5 text-emerald-500" />
              <span>{isBn ? 'মেনশন (@)' : 'Mention (@)'}</span>
            </Button>

            {/* Quick # Patient mention trigger button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setMentionType('patient');
                setMentionQuery('');
                searchPatients('');
              }}
              className="h-7 px-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1 cursor-pointer"
            >
              <Hash className="size-3.5 text-teal-500" />
              <span>{isBn ? 'রোগী (#)' : 'Patient (#)'}</span>
            </Button>
          </div>

          <span className="text-[10px] text-muted-foreground hidden md:inline">
            {isBn ? 'ক্লিনিক্যাল টিম চ্যাটে পাঠানো বার্তা স্থায়ীভাবে সংরক্ষিত থাকে' : 'Messages are permanently archived for clinical audit'}
          </span>
        </div>
      </form>

      {/* ----------------------------------------------------------------------- */}
      {/* 7. Date Selector Modal Dialog */}
      {/* ----------------------------------------------------------------------- */}
      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent className="max-w-md p-4 sm:p-6 rounded-2xl" onClose={() => setShowDateDialog(false)}>
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="size-5 text-emerald-500" />
              <span>{isBn ? 'তারিখ ভিত্তিক বার্তা ইতিহাস' : 'Select Chat History Date'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isBn
                ? 'নির্দিষ্ট তারিখের ক্লিনিক্যাল কথোপকথন ও সংরক্ষিত নির্দেশনা দেখুন।'
                : 'Select an archive date to view clinical consultations, patient notes, and handoffs.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Quick Shortcuts */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={selectedDate === todayIso ? 'default' : 'outline'}
                onClick={() => handleSelectDate(todayIso)}
                className="h-10 rounded-xl font-bold text-xs"
              >
                <Clock className="size-3.5 mr-1.5" />
                <span>{isBn ? 'আজকে (Today)' : 'Today'}</span>
              </Button>
              <Button
                type="button"
                variant={selectedDate === getYesterdayIsoDate() ? 'default' : 'outline'}
                onClick={() => handleSelectDate(getYesterdayIsoDate())}
                className="h-10 rounded-xl font-bold text-xs"
              >
                <History className="size-3.5 mr-1.5" />
                <span>{isBn ? 'গতকাল (Yesterday)' : 'Yesterday'}</span>
              </Button>
            </div>

            {/* Custom Date Input */}
            <div className="space-y-1.5 pt-2 border-t border-border/40">
              <label className="text-xs font-semibold text-foreground">
                {isBn ? 'অন্যান্য নির্দিষ্ট তারিখ বেছে নিন' : 'Choose Specific Date'}
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={customDateInput}
                  onChange={(e) => setCustomDateInput(e.target.value)}
                  className="rounded-xl text-xs h-9"
                />
                <Button
                  type="button"
                  onClick={() => customDateInput && handleSelectDate(customDateInput)}
                  className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0"
                >
                  {isBn ? 'দেখুন' : 'Load'}
                </Button>
              </div>
            </div>

            {/* List of dates with message history */}
            {availableDates.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                <span className="text-xs font-semibold text-muted-foreground">
                  {isBn ? 'সংরক্ষিত বার্তা সম্পন্ন পূর্ববর্তী তারিখসমূহ:' : 'Dates with message history:'}
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                  {availableDates.map((d) => (
                    <Button
                      key={d}
                      type="button"
                      size="sm"
                      variant={selectedDate === d ? 'default' : 'outline'}
                      onClick={() => handleSelectDate(d)}
                      className="h-7 px-2.5 rounded-lg text-xs font-medium"
                    >
                      {formatChatDateDisplay(d, isBn)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDateDialog(false)}
              className="rounded-xl text-xs h-9 w-full sm:w-auto"
            >
              {isBn ? 'বাতিল' : 'Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------------- */}
      {/* 8. Patient Timeline Modal */}
      {/* ----------------------------------------------------------------------- */}
      <PatientTimelineModal
        open={selectedTimelinePatient.open}
        onOpenChange={(open) => setSelectedTimelinePatient((prev) => ({ ...prev, open }))}
        patientId={selectedTimelinePatient.patientId}
        patientName={selectedTimelinePatient.patientName}
        mrn={selectedTimelinePatient.mrn}
        phone={selectedTimelinePatient.phone}
      />
    </div>
  );
}

// =============================================================================
// Helper: Content Formatter with @mentions and #patient highlighting
// =============================================================================

function renderFormattedContent(text: string) {
  if (!text) return null;

  // Split tokens by spaces and newlines
  const parts = text.split(/(\s+)/);

  return parts.map((part, index) => {
    // Role or User mention: e.g. @all, @doctors, @Dr.Toufiq
    if (part.startsWith('@') && part.length > 1) {
      const isRole = ROLE_GROUPS.some((r) => r.id === part);
      return (
        <span
          key={index}
          className={cn(
            'inline-block px-1.5 py-0.2 rounded-md font-bold text-xs mr-0.5',
            isRole
              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
              : 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30'
          )}
        >
          {part}
        </span>
      );
    }

    // Patient mention: e.g. #MRN-2026-0001
    if (part.startsWith('#') && part.length > 1) {
      return (
        <span
          key={index}
          className="inline-block px-1.5 py-0.2 rounded-md font-mono font-bold text-xs text-blue-700 dark:text-blue-300 bg-blue-500/15 border border-blue-500/30 mr-0.5"
        >
          {part}
        </span>
      );
    }

    return part;
  });
}

export default ClinicRealtimeChatView;