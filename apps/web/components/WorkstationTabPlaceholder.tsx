// apps/web/components/WorkstationTabPlaceholder.tsx
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { LucideIcon, Sparkles, Layers } from 'lucide-react';
import { useLanguage } from '../lib/i18n';

interface WorkstationTabPlaceholderProps {
  titleEn: string;
  titleBn: string;
  descriptionEn?: string;
  descriptionBn?: string;
  icon: LucideIcon;
  badgeEn?: string;
  badgeBn?: string;
}

export function WorkstationTabPlaceholder({
  titleEn,
  titleBn,
  descriptionEn = 'Workstation module initialized and ready for workflow operations.',
  descriptionBn = 'ওয়ার্কস্টেশন মডিউল প্রস্তুত এবং কার্যপ্রণালী পরিচালনার জন্য সচল।',
  icon: Icon,
  badgeEn = 'Scaffolding Active',
  badgeBn = 'সক্রিয় মডিউল',
}: WorkstationTabPlaceholderProps) {
  const { language } = useLanguage();

  return (
    <div className="w-full max-w-full py-3 sm:py-5 animate-in fade-in-50 duration-300">
      <Card className="border-border/50 bg-card/60 backdrop-blur-xl shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-6 border-b border-border/40 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>{language === 'bn' ? titleBn : titleEn}</span>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs px-2 py-0.5 font-medium">
                    {language === 'bn' ? badgeBn : badgeEn}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {language === 'bn' ? descriptionBn : descriptionEn}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background/50 px-3 py-1.5 rounded-lg border border-border/40 w-fit">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>HPC Jashore v0.1.0</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-10 flex flex-col items-center justify-center min-h-[320px] text-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-inner">
              <Icon className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-background border border-border">
              <Layers className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1">
            {language === 'bn' ? `${titleBn} ওয়ার্কস্পেস` : `${titleEn} Workspace`}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            {language === 'bn'
              ? `${titleBn} সংক্রান্ত সকল ডাটা এবং পরিচালনা উইজেট এই স্ক্রিনে উপস্থাপিত হবে।`
              : `All data feeds and operational tools for ${titleEn} are initialized and isolated within this role workspace.`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
